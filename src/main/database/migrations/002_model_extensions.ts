import Database from 'better-sqlite3';
import { Migration } from '../migrator';

export const migration002: Migration = {
  version: 2,
  name: 'model_extensions_and_artificial_analysis',
  up: (db: Database.Database) => {
    // Add columns to models table safely
    const tableInfo = db.prepare(`PRAGMA table_info(models)`).all() as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    if (!existingColumns.has('context_window')) {
      db.exec(`ALTER TABLE models ADD COLUMN context_window TEXT;`);
    }
    if (!existingColumns.has('is_reasoning_model')) {
      db.exec(`ALTER TABLE models ADD COLUMN is_reasoning_model INTEGER DEFAULT 0;`);
    }
    if (!existingColumns.has('aa_intelligence_index')) {
      db.exec(`ALTER TABLE models ADD COLUMN aa_intelligence_index REAL;`);
    }
    if (!existingColumns.has('aa_evaluations_json')) {
      db.exec(`ALTER TABLE models ADD COLUMN aa_evaluations_json TEXT;`);
    }
    if (!existingColumns.has('aa_model_id')) {
      db.exec(`ALTER TABLE models ADD COLUMN aa_model_id TEXT;`);
    }
  },
};
