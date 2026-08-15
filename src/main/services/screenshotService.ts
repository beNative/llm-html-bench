import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Screenshot } from '../../shared/types/entities';
import { getScreenshotsDir } from '../database/connection';

export class ScreenshotService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public saveScreenshot(runId: string, base64Data: string, width: number, height: number): Screenshot {
    const id = uuidv4();
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const screenshotsDir = getScreenshotsDir();
    const fileName = `${id}.png`;
    const filePath = path.join(screenshotsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    this.db
      .prepare(`
        INSERT INTO screenshots (id, model_run_id, file_path, viewport_width, viewport_height, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(id, runId, filePath, width, height);

    return this.db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as Screenshot;
  }
}
