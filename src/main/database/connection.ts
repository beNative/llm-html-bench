import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Migrator } from './migrator';
import { migration001 } from './migrations/001_initial_schema';
import { DEFAULT_COLLECTIONS } from '../../shared/constants/defaults';
import { v4 as uuidv4 } from 'uuid';

let dbInstance: Database.Database | null = null;
let dbPathInstance: string = '';

export function getDatabasePath(): string {
  if (process.env.BENCHMARK_DB_PATH) {
    return process.env.BENCHMARK_DB_PATH;
  }
  let userDataPath: string;
  try {
    userDataPath = app.getPath('userData');
  } catch {
    userDataPath = path.join(process.cwd(), '.data');
  }
  const dbDir = path.join(userDataPath, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'benchmark.sqlite');
}

export function getScreenshotsDir(): string {
  let userDataPath: string;
  try {
    userDataPath = app.getPath('userData');
  } catch {
    userDataPath = path.join(process.cwd(), '.data');
  }
  const dir = path.join(userDataPath, 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getBackupsDir(): string {
  let userDataPath: string;
  try {
    userDataPath = app.getPath('userData');
  } catch {
    userDataPath = path.join(process.cwd(), '.data');
  }
  const dir = path.join(userDataPath, 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function initializeDatabase(customPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  dbPathInstance = customPath || getDatabasePath();
  const dbDir = path.dirname(dbPathInstance);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPathInstance);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  const migrator = new Migrator(db, [migration001]);
  migrator.runMigrations();

  // Seed default collections if none exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM collections').get() as { count: number };
  if (countRow.count === 0) {
    const insert = db.prepare('INSERT INTO collections (id, name, description) VALUES (?, ?, ?)');
    for (const col of DEFAULT_COLLECTIONS) {
      insert.run(uuidv4(), col.name, col.description);
    }
  }

  dbInstance = db;
  return dbInstance;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
