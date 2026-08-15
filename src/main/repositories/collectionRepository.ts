import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Collection } from '../../shared/types/entities';

export class CollectionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getCollections(): Collection[] {
    const sql = `
      SELECT 
        c.id, c.name, c.description, c.created_at,
        COUNT(pc.prompt_id) as prompt_count
      FROM collections c
      LEFT JOIN prompt_collections pc ON c.id = pc.collection_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return this.db.prepare(sql).all() as Collection[];
  }

  public createCollection(name: string, description?: string): Collection {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO collections (id, name, description, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(id, name.trim(), description?.trim() ?? null);

    return this.db.prepare('SELECT *, 0 as prompt_count FROM collections WHERE id = ?').get(id) as Collection;
  }

  public updateCollection(id: string, name: string, description?: string): Collection {
    this.db
      .prepare('UPDATE collections SET name = ?, description = ? WHERE id = ?')
      .run(name.trim(), description?.trim() ?? null, id);

    return this.db
      .prepare(`
        SELECT c.*, COUNT(pc.prompt_id) as prompt_count
        FROM collections c
        LEFT JOIN prompt_collections pc ON c.id = pc.collection_id
        WHERE c.id = ?
        GROUP BY c.id
      `)
      .get(id) as Collection;
  }

  public deleteCollection(id: string): void {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  }
}
