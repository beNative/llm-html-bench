import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Tag } from '../../shared/types/entities';

export class TagRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getTags(): Tag[] {
    const sql = `
      SELECT 
        t.id, t.name, t.created_at,
        COUNT(pt.prompt_id) as prompt_count
      FROM tags t
      LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `;
    return this.db.prepare(sql).all() as Tag[];
  }

  public createTag(name: string): Tag {
    const trimmed = name.trim();
    const existing = this.db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(trimmed) as Tag | undefined;
    if (existing) {
      return existing;
    }
    const id = uuidv4();
    this.db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(id, trimmed);
    return this.db.prepare('SELECT *, 0 as prompt_count FROM tags WHERE id = ?').get(id) as Tag;
  }
}
