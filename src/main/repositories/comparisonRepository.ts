import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { HeadToHeadComparison } from '../../shared/types/entities';
import { SaveHeadToHeadInput } from '../../shared/types/ipc';

export class ComparisonRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public saveHeadToHeadComparison(input: SaveHeadToHeadInput): HeadToHeadComparison {
    const id = uuidv4();
    this.db
      .prepare(`
        INSERT INTO head_to_head_comparisons (
          id, prompt_version_id, left_run_id, right_run_id, winner, dimension_reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(
        id,
        input.promptVersionId,
        input.leftRunId,
        input.rightRunId,
        input.winner,
        input.dimensionReason,
        input.notes ?? null
      );

    return this.getComparisonById(id)!;
  }

  public getComparisonById(id: string): HeadToHeadComparison | null {
    const sql = `
      SELECT 
        h.*,
        lm.display_name as left_model_name,
        rm.display_name as right_model_name,
        p.name as prompt_name
      FROM head_to_head_comparisons h
      JOIN model_runs lr ON h.left_run_id = lr.id
      JOIN models lm ON lr.model_id = lm.id
      JOIN model_runs rr ON h.right_run_id = rr.id
      JOIN models rm ON rr.model_id = rm.id
      JOIN prompt_versions pv ON h.prompt_version_id = pv.id
      JOIN prompts p ON pv.prompt_id = p.id
      WHERE h.id = ?
    `;
    const row = this.db.prepare(sql).get(id) as HeadToHeadComparison | undefined;
    return row || null;
  }

  public getComparisonsForPrompt(promptVersionId?: string): HeadToHeadComparison[] {
    let sql = `
      SELECT 
        h.*,
        lm.display_name as left_model_name,
        rm.display_name as right_model_name,
        p.name as prompt_name
      FROM head_to_head_comparisons h
      JOIN model_runs lr ON h.left_run_id = lr.id
      JOIN models lm ON lr.model_id = lm.id
      JOIN model_runs rr ON h.right_run_id = rr.id
      JOIN models rm ON rr.model_id = rm.id
      JOIN prompt_versions pv ON h.prompt_version_id = pv.id
      JOIN prompts p ON pv.prompt_id = p.id
    `;
    const params: string[] = [];
    if (promptVersionId) {
      sql += ' WHERE h.prompt_version_id = ?';
      params.push(promptVersionId);
    }
    sql += ' ORDER BY h.created_at DESC';

    return this.db.prepare(sql).all(...params) as HeadToHeadComparison[];
  }
}
