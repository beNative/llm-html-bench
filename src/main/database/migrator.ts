import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export class Migrator {
  private db: Database.Database;
  private migrations: Migration[];

  constructor(db: Database.Database, migrations: Migration[]) {
    this.db = db;
    this.migrations = migrations.sort((a, b) => a.version - b.version);
  }

  public runMigrations(): void {
    // Enable foreign keys & WAL mode
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRows = this.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as { version: number }[];

    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    for (const migration of this.migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        const runTx = this.db.transaction(() => {
          migration.up(this.db);
          this.db
            .prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
            .run(migration.version, migration.name);
        });
        runTx();
      }
    }
  }

  public getCurrentVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) as version FROM schema_migrations')
      .get() as { version: number | null };
    return row?.version ?? 0;
  }
}
