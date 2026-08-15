import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Evaluation } from '../../shared/types/entities';
import { SaveEvaluationInput } from '../../shared/types/ipc';
import { calculateOverallScore } from '../../shared/utils/scoreCalculator';

export class EvaluationRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public saveEvaluation(input: SaveEvaluationInput): Evaluation {
    let overall = input.overallScore;
    if (!input.isManualOverall) {
      overall = calculateOverallScore({
        visualScore: input.visualScore,
        promptAdherenceScore: input.promptAdherenceScore,
        functionalityScore: input.functionalityScore,
        codeQualityScore: input.codeQualityScore,
        creativityScore: input.creativityScore,
      });
    }

    const existing = this.db
      .prepare('SELECT id FROM evaluations WHERE model_run_id = ?')
      .get(input.modelRunId) as { id: string } | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE evaluations SET
            visual_score = ?,
            prompt_adherence_score = ?,
            functionality_score = ?,
            code_quality_score = ?,
            creativity_score = ?,
            overall_score = ?,
            is_manual_overall = ?,
            favorite = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE model_run_id = ?
        `)
        .run(
          input.visualScore ?? null,
          input.promptAdherenceScore ?? null,
          input.functionalityScore ?? null,
          input.codeQualityScore ?? null,
          input.creativityScore ?? null,
          overall,
          input.isManualOverall ? 1 : 0,
          input.favorite ? 1 : 0,
          input.notes ?? null,
          input.modelRunId
        );
      return this.db.prepare('SELECT * FROM evaluations WHERE model_run_id = ?').get(input.modelRunId) as Evaluation;
    } else {
      const id = uuidv4();
      this.db
        .prepare(`
          INSERT INTO evaluations (
            id, model_run_id, visual_score, prompt_adherence_score, functionality_score,
            code_quality_score, creativity_score, overall_score, is_manual_overall,
            favorite, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .run(
          id,
          input.modelRunId,
          input.visualScore ?? null,
          input.promptAdherenceScore ?? null,
          input.functionalityScore ?? null,
          input.codeQualityScore ?? null,
          input.creativityScore ?? null,
          overall,
          input.isManualOverall ? 1 : 0,
          input.favorite ? 1 : 0,
          input.notes ?? null
        );
      return this.db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id) as Evaluation;
    }
  }

  public getEvaluationForRun(modelRunId: string): Evaluation | null {
    const row = this.db
      .prepare('SELECT * FROM evaluations WHERE model_run_id = ?')
      .get(modelRunId) as Evaluation | undefined;
    return row || null;
  }
}
