import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Prompt, PromptVersion, Tag, Collection } from '../../shared/types/entities';
import { CreatePromptInput, UpdatePromptInput, CreatePromptVersionInput } from '../../shared/types/ipc';

export class PromptRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getPrompts(filter?: {
    search?: string;
    category?: string;
    tagId?: string;
    collectionId?: string;
    archived?: boolean;
    sortBy?: 'name' | 'created_at' | 'last_tested' | 'run_count';
    sortOrder?: 'asc' | 'desc';
  }): Prompt[] {
    let sql = `
      SELECT 
        p.id, p.name, p.description, p.category, p.archived, p.created_at, p.updated_at,
        (SELECT COUNT(*) FROM prompt_versions pv WHERE pv.prompt_id = p.id) as version_count,
        (SELECT COUNT(*) FROM model_runs mr JOIN prompt_versions pv ON mr.prompt_version_id = pv.id WHERE pv.prompt_id = p.id) as run_count,
        (SELECT MAX(mr.started_at) FROM model_runs mr JOIN prompt_versions pv ON mr.prompt_version_id = pv.id WHERE pv.prompt_id = p.id) as last_tested_at
      FROM prompts p
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.archived !== undefined) {
      sql += ` AND p.archived = ?`;
      params.push(filter.archived ? 1 : 0);
    } else {
      sql += ` AND p.archived = 0`;
    }

    if (filter?.category && filter.category !== 'All') {
      sql += ` AND p.category = ?`;
      params.push(filter.category);
    }

    if (filter?.tagId) {
      sql += ` AND p.id IN (SELECT prompt_id FROM prompt_tags WHERE tag_id = ?)`;
      params.push(filter.tagId);
    }

    if (filter?.collectionId) {
      sql += ` AND p.id IN (SELECT prompt_id FROM prompt_collections WHERE collection_id = ?)`;
      params.push(filter.collectionId);
    }

    if (filter?.search && filter.search.trim() !== '') {
      const term = `%${filter.search.trim()}%`;
      sql += ` AND (
        p.name LIKE ? OR 
        p.description LIKE ? OR 
        p.id IN (SELECT prompt_id FROM prompt_versions WHERE prompt_text LIKE ?)
      )`;
      params.push(term, term, term);
    }

    // Sort order
    const order = filter?.sortOrder === 'desc' ? 'DESC' : 'ASC';
    switch (filter?.sortBy) {
      case 'created_at':
        sql += ` ORDER BY p.created_at ${order}`;
        break;
      case 'last_tested':
        sql += ` ORDER BY last_tested_at ${order} NULLS LAST`;
        break;
      case 'run_count':
        sql += ` ORDER BY run_count ${order}`;
        break;
      case 'name':
      default:
        sql += ` ORDER BY p.name ${order}`;
        break;
    }

    const rows = this.db.prepare(sql).all(...params) as (Prompt & { version_count: number; run_count: number; last_tested_at: string | null })[];

    return rows.map((r) => this.enrichPrompt(r));
  }

  public getPromptById(id: string): Prompt | null {
    const row = this.db
      .prepare(`
        SELECT 
          p.id, p.name, p.description, p.category, p.archived, p.created_at, p.updated_at,
          (SELECT COUNT(*) FROM prompt_versions pv WHERE pv.prompt_id = p.id) as version_count,
          (SELECT COUNT(*) FROM model_runs mr JOIN prompt_versions pv ON mr.prompt_version_id = pv.id WHERE pv.prompt_id = p.id) as run_count,
          (SELECT MAX(mr.started_at) FROM model_runs mr JOIN prompt_versions pv ON mr.prompt_version_id = pv.id WHERE pv.prompt_id = p.id) as last_tested_at
        FROM prompts p
        WHERE p.id = ?
      `)
      .get(id) as (Prompt & { version_count: number; run_count: number; last_tested_at: string | null }) | undefined;

    if (!row) return null;
    return this.enrichPrompt(row);
  }

  private enrichPrompt(prompt: Prompt): Prompt {
    // Fetch latest version
    const latestVersion = this.db
      .prepare(`
        SELECT 
          pv.id, pv.prompt_id, pv.version, pv.prompt_text, pv.notes, pv.created_at,
          (SELECT COUNT(*) FROM model_runs mr WHERE mr.prompt_version_id = pv.id) as run_count
        FROM prompt_versions pv
        WHERE pv.prompt_id = ?
        ORDER BY pv.version DESC
        LIMIT 1
      `)
      .get(prompt.id) as PromptVersion | undefined;

    // Fetch tags
    const tags = this.db
      .prepare(`
        SELECT t.id, t.name, t.created_at
        FROM tags t
        JOIN prompt_tags pt ON t.id = pt.tag_id
        WHERE pt.prompt_id = ?
      `)
      .all(prompt.id) as Tag[];

    // Fetch collections
    const collections = this.db
      .prepare(`
        SELECT c.id, c.name, c.description, c.created_at
        FROM collections c
        JOIN prompt_collections pc ON c.id = pc.collection_id
        WHERE pc.prompt_id = ?
      `)
      .all(prompt.id) as Collection[];

    return {
      ...prompt,
      latest_version: latestVersion,
      tags,
      collections,
    };
  }

  public createPrompt(input: CreatePromptInput): Prompt {
    const promptId = uuidv4();
    const versionId = uuidv4();

    const tx = this.db.transaction(() => {
      // 1. Insert prompt
      this.db
        .prepare(`
          INSERT INTO prompts (id, name, description, category, archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .run(promptId, input.name, input.description ?? null, input.category);

      // 2. Insert initial version (version 1)
      this.db
        .prepare(`
          INSERT INTO prompt_versions (id, prompt_id, version, prompt_text, notes, created_at)
          VALUES (?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
        `)
        .run(versionId, promptId, input.promptText, input.notes ?? null);

      // 3. Link tags
      if (input.tags && input.tags.length > 0) {
        for (const tagName of input.tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;
          let tag = this.db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(trimmed) as { id: string } | undefined;
          if (!tag) {
            const newTagId = uuidv4();
            this.db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(newTagId, trimmed);
            tag = { id: newTagId };
          }
          this.db.prepare('INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)').run(promptId, tag.id);
        }
      }

      // 4. Link collections
      if (input.collectionIds && input.collectionIds.length > 0) {
        for (const colId of input.collectionIds) {
          this.db.prepare('INSERT OR IGNORE INTO prompt_collections (prompt_id, collection_id) VALUES (?, ?)').run(promptId, colId);
        }
      }
    });

    tx();
    return this.getPromptById(promptId)!;
  }

  public updatePrompt(input: UpdatePromptInput): Prompt {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE prompts
          SET name = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(input.name, input.description ?? null, input.category, input.id);

      if (input.tags !== undefined) {
        this.db.prepare('DELETE FROM prompt_tags WHERE prompt_id = ?').run(input.id);
        for (const tagName of input.tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;
          let tag = this.db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(trimmed) as { id: string } | undefined;
          if (!tag) {
            const newTagId = uuidv4();
            this.db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(newTagId, trimmed);
            tag = { id: newTagId };
          }
          this.db.prepare('INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)').run(input.id, tag.id);
        }
      }

      if (input.collectionIds !== undefined) {
        this.db.prepare('DELETE FROM prompt_collections WHERE prompt_id = ?').run(input.id);
        for (const colId of input.collectionIds) {
          this.db.prepare('INSERT OR IGNORE INTO prompt_collections (prompt_id, collection_id) VALUES (?, ?)').run(input.id, colId);
        }
      }
    });

    tx();
    return this.getPromptById(input.id)!;
  }

  public createPromptVersion(input: CreatePromptVersionInput): PromptVersion {
    const nextVersionRow = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) + 1 as next_ver FROM prompt_versions WHERE prompt_id = ?')
      .get(input.promptId) as { next_ver: number };

    const versionId = uuidv4();
    const versionNum = nextVersionRow.next_ver;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO prompt_versions (id, prompt_id, version, prompt_text, notes, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .run(versionId, input.promptId, versionNum, input.promptText, input.notes ?? null);

      this.db
        .prepare('UPDATE prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(input.promptId);
    });

    tx();

    return this.db
      .prepare(`
        SELECT pv.*, (SELECT COUNT(*) FROM model_runs mr WHERE mr.prompt_version_id = pv.id) as run_count
        FROM prompt_versions pv
        WHERE pv.id = ?
      `)
      .get(versionId) as PromptVersion;
  }

  public getPromptVersions(promptId: string): PromptVersion[] {
    return this.db
      .prepare(`
        SELECT 
          pv.id, pv.prompt_id, pv.version, pv.prompt_text, pv.notes, pv.created_at,
          (SELECT COUNT(*) FROM model_runs mr WHERE mr.prompt_version_id = pv.id) as run_count
        FROM prompt_versions pv
        WHERE pv.prompt_id = ?
        ORDER BY pv.version DESC
      `)
      .all(promptId) as PromptVersion[];
  }

  public archivePrompt(id: string, archived: boolean): void {
    this.db
      .prepare('UPDATE prompts SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(archived ? 1 : 0, id);
  }

  public deletePrompt(id: string): void {
    this.db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  }
}
