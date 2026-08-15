import Database from 'better-sqlite3';
import fs from 'fs';
import { DatabaseInfo } from '../../shared/types/ipc';
import { ProviderConfig } from '../../shared/types/providers';
import { getDatabasePath } from '../database/connection';
import { encryptString, decryptString } from '../security/safeStorage';

export class SettingsService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getDatabaseInfo(): DatabaseInfo {
    const dbPath = getDatabasePath();
    let sizeBytes = 0;
    try {
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        sizeBytes = stat.size;
      }
    } catch (e) {
      console.warn('Failed to stat db file:', e);
    }

    const versionRow = this.db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number };
    const promptCount = (this.db.prepare('SELECT COUNT(*) as c FROM prompts').get() as { c: number }).c;
    const pvCount = (this.db.prepare('SELECT COUNT(*) as c FROM prompt_versions').get() as { c: number }).c;
    const modelCount = (this.db.prepare('SELECT COUNT(*) as c FROM models').get() as { c: number }).c;
    const runCount = (this.db.prepare('SELECT COUNT(*) as c FROM model_runs').get() as { c: number }).c;
    const outputCount = (this.db.prepare('SELECT COUNT(*) as c FROM outputs').get() as { c: number }).c;
    const evalCount = (this.db.prepare('SELECT COUNT(*) as c FROM evaluations').get() as { c: number }).c;
    const compCount = (this.db.prepare('SELECT COUNT(*) as c FROM head_to_head_comparisons').get() as { c: number }).c;

    return {
      filePath: dbPath,
      sizeBytes,
      version: versionRow?.v || 1,
      counts: {
        prompts: promptCount,
        promptVersions: pvCount,
        models: modelCount,
        runs: runCount,
        outputs: outputCount,
        evaluations: evalCount,
        comparisons: compCount,
      },
    };
  }

  public async backupDatabase(targetPath: string): Promise<{ success: boolean; filePath: string }> {
    await this.db.backup(targetPath);
    return { success: true, filePath: targetPath };
  }

  public async restoreDatabase(sourcePath: string): Promise<{ success: boolean }> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Restore source file does not exist: ${sourcePath}`);
    }

    const dbPath = getDatabasePath();
    this.db.close();

    fs.copyFileSync(sourcePath, dbPath);

    return { success: true };
  }

  public vacuumDatabase(): void {
    this.db.exec('VACUUM;');
  }

  public getProviderConfigs(): ProviderConfig[] {
    const row = this.db.prepare('SELECT value_json FROM app_settings WHERE key = ?').get('provider_configs') as
      | { value_json: string }
      | undefined;
    if (!row) return [];

    try {
      const parsed: ProviderConfig[] = JSON.parse(row.value_json);
      return parsed.map((p) => ({
        ...p,
        apiKey: p.apiKey ? decryptString(p.apiKey) : undefined,
      }));
    } catch {
      return [];
    }
  }

  public saveProviderConfig(config: ProviderConfig): void {
    const existing = this.getProviderConfigs();
    const index = existing.findIndex((c) => c.id === config.id);

    const encryptedConfig = {
      ...config,
      apiKey: config.apiKey ? encryptString(config.apiKey) : undefined,
    };

    if (index >= 0) {
      existing[index] = encryptedConfig;
    } else {
      existing.push(encryptedConfig);
    }

    this.db
      .prepare(
        `
      INSERT INTO app_settings (key, value_json, updated_at)
      VALUES ('provider_configs', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
    `
      )
      .run(JSON.stringify(existing));
  }
}
