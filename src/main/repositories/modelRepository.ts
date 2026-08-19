import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Model } from '../../shared/types/entities';
import { CreateModelInput } from '../../shared/types/ipc';

export class ModelRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getModels(): Model[] {
    const sql = `
      SELECT 
        m.*,
        COUNT(DISTINCT mr.id) as run_count,
        COUNT(DISTINCT pv.prompt_id) as prompt_count,
        ROUND(AVG(e.overall_score), 2) as avg_overall_score,
        ROUND(AVG(e.visual_score), 2) as avg_visual_score,
        ROUND(AVG(e.prompt_adherence_score), 2) as avg_adherence_score,
        ROUND(AVG(e.functionality_score), 2) as avg_functionality_score,
        ROUND(AVG(e.code_quality_score), 2) as avg_code_quality_score,
        ROUND(AVG(e.creativity_score), 2) as avg_creativity_score
      FROM models m
      LEFT JOIN model_runs mr ON m.id = mr.model_id
      LEFT JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
      LEFT JOIN evaluations e ON mr.id = e.model_run_id
      GROUP BY m.id
      ORDER BY m.provider ASC, m.display_name ASC
    `;
    return this.db.prepare(sql).all() as Model[];
  }

  public getModelById(id: string): Model | null {
    const sql = `
      SELECT 
        m.*,
        COUNT(DISTINCT mr.id) as run_count,
        COUNT(DISTINCT pv.prompt_id) as prompt_count,
        ROUND(AVG(e.overall_score), 2) as avg_overall_score,
        ROUND(AVG(e.visual_score), 2) as avg_visual_score,
        ROUND(AVG(e.prompt_adherence_score), 2) as avg_adherence_score,
        ROUND(AVG(e.functionality_score), 2) as avg_functionality_score,
        ROUND(AVG(e.code_quality_score), 2) as avg_code_quality_score,
        ROUND(AVG(e.creativity_score), 2) as avg_creativity_score
      FROM models m
      LEFT JOIN model_runs mr ON m.id = mr.model_id
      LEFT JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
      LEFT JOIN evaluations e ON mr.id = e.model_run_id
      WHERE m.id = ?
      GROUP BY m.id
    `;
    const model = this.db.prepare(sql).get(id) as Model | undefined;
    return model || null;
  }

  public createModel(input: CreateModelInput): Model {
    const id = uuidv4();
    this.db
      .prepare(`
        INSERT INTO models (
          id, provider, model_name, display_name, model_version, model_family,
          parameter_count, architecture, quantization, local_or_cloud,
          context_window, is_reasoning_model, aa_intelligence_index, aa_evaluations_json, aa_model_id,
          notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(
        id,
        input.provider,
        input.modelName,
        input.displayName || `${input.provider} ${input.modelName}`,
        input.modelVersion ?? null,
        input.modelFamily ?? null,
        input.parameterCount ?? null,
        input.architecture ?? null,
        input.quantization ?? null,
        input.localOrCloud ?? null,
        input.contextWindow ?? null,
        input.isReasoningModel ? 1 : 0,
        input.aaIntelligenceIndex ?? null,
        input.aaEvaluationsJson ?? null,
        input.aaModelId ?? null,
        input.notes ?? null
      );

    return this.getModelById(id)!;
  }

  public updateModel(id: string, input: Partial<CreateModelInput>): Model {
    const existing = this.getModelById(id);
    if (!existing) {
      throw new Error(`Model with id ${id} not found`);
    }

    this.db
      .prepare(`
        UPDATE models SET
          provider = COALESCE(?, provider),
          model_name = COALESCE(?, model_name),
          display_name = COALESCE(?, display_name),
          model_version = COALESCE(?, model_version),
          model_family = COALESCE(?, model_family),
          parameter_count = COALESCE(?, parameter_count),
          architecture = COALESCE(?, architecture),
          quantization = COALESCE(?, quantization),
          local_or_cloud = COALESCE(?, local_or_cloud),
          context_window = COALESCE(?, context_window),
          is_reasoning_model = COALESCE(?, is_reasoning_model),
          aa_intelligence_index = COALESCE(?, aa_intelligence_index),
          aa_evaluations_json = COALESCE(?, aa_evaluations_json),
          aa_model_id = COALESCE(?, aa_model_id),
          notes = COALESCE(?, notes)
        WHERE id = ?
      `)
      .run(
        input.provider ?? null,
        input.modelName ?? null,
        input.displayName ?? null,
        input.modelVersion ?? null,
        input.modelFamily ?? null,
        input.parameterCount ?? null,
        input.architecture ?? null,
        input.quantization ?? null,
        input.localOrCloud ?? null,
        input.contextWindow ?? null,
        input.isReasoningModel !== undefined ? (input.isReasoningModel ? 1 : 0) : null,
        input.aaIntelligenceIndex ?? null,
        input.aaEvaluationsJson ?? null,
        input.aaModelId ?? null,
        input.notes ?? null,
        id
      );

    return this.getModelById(id)!;
  }

  public deleteModel(id: string): void {
    this.db.prepare('DELETE FROM models WHERE id = ?').run(id);
  }
}
