import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ModelRun, Output, Evaluation, Screenshot } from '../../shared/types/entities';
import { CreateModelRunInput, SaveModifiedOutputInput } from '../../shared/types/ipc';
import { extractHtml } from '../../shared/utils/htmlExtractor';
import { calculateOverallScore } from '../../shared/utils/scoreCalculator';
import { APP_VERSION } from '../../shared/constants/defaults';

export class RunRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public createModelRun(input: CreateModelRunInput): ModelRun {
    const runId = uuidv4();
    const outputId = uuidv4();
    const evaluationId = uuidv4();

    // Determine next run number for this prompt_version and model
    const maxRunRow = this.db
      .prepare('SELECT COALESCE(MAX(run_number), 0) + 1 as next_run FROM model_runs WHERE prompt_version_id = ? AND model_id = ?')
      .get(input.promptVersionId, input.modelId) as { next_run: number };

    const runNumber = maxRunRow.next_run;
    const finalHtml = input.html && input.html.trim().length > 0 ? input.html : extractHtml(input.rawOutput);

    const tx = this.db.transaction(() => {
      // 1. Insert Model Run
      this.db
        .prepare(`
          INSERT INTO model_runs (
            id, prompt_version_id, model_id, run_number, temperature, top_p, top_k,
            max_tokens, seed, reasoning_effort, context_length, generation_time_ms,
            input_tokens, output_tokens, tokens_per_second, started_at, completed_at,
            notes, metadata_json, app_version, provenance, requested_model_id, resolved_model_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          runId,
          input.promptVersionId,
          input.modelId,
          runNumber,
          input.temperature ?? null,
          input.topP ?? null,
          input.topK ?? null,
          input.maxTokens ?? null,
          input.seed ?? null,
          input.reasoningEffort ?? null,
          input.contextLength ?? null,
          input.generationTimeMs ?? null,
          input.inputTokens ?? null,
          input.outputTokens ?? null,
          input.tokensPerSecond ?? null,
          input.notes ?? null,
          input.metadataJson ?? null,
          APP_VERSION,
          input.provenance || 'manual-paste',
          input.requestedModelId ?? null,
          input.resolvedModelId ?? null
        );

      // 2. Insert Output
      this.db
        .prepare(`
          INSERT INTO outputs (id, model_run_id, output_type, raw_output, html, is_modified, created_at)
          VALUES (?, ?, 'html', ?, ?, 0, CURRENT_TIMESTAMP)
        `)
        .run(outputId, runId, input.rawOutput, finalHtml);

      // 3. Insert Evaluation if provided or create empty
      const evalInput = input.evaluation;
      let overall = evalInput?.overallScore ?? null;
      const isManualOverall = evalInput?.isManualOverall ? 1 : 0;
      if (overall === null && evalInput) {
        overall = calculateOverallScore({
          visualScore: evalInput.visualScore,
          promptAdherenceScore: evalInput.promptAdherenceScore,
          functionalityScore: evalInput.functionalityScore,
          codeQualityScore: evalInput.codeQualityScore,
          creativityScore: evalInput.creativityScore,
        });
      }

      this.db
        .prepare(`
          INSERT INTO evaluations (
            id, model_run_id, visual_score, prompt_adherence_score, functionality_score,
            code_quality_score, creativity_score, overall_score, is_manual_overall, favorite, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .run(
          evaluationId,
          runId,
          evalInput?.visualScore ?? null,
          evalInput?.promptAdherenceScore ?? null,
          evalInput?.functionalityScore ?? null,
          evalInput?.codeQualityScore ?? null,
          evalInput?.creativityScore ?? null,
          overall,
          isManualOverall,
          evalInput?.favorite ? 1 : 0,
          evalInput?.notes ?? null
        );
    });

    tx();
    return this.getRunById(runId)!;
  }

  public getRunById(id: string): ModelRun | null {
    const row = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        WHERE mr.id = ?
      `)
      .get(id) as ModelRun | undefined;

    if (!row) return null;
    return this.enrichRun(row);
  }

  public getRunsByIds(ids: string[]): ModelRun[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        WHERE mr.id IN (${placeholders})
      `)
      .all(...ids) as ModelRun[];

    return rows.map((r) => this.enrichRun(r));
  }

  public getRunsForPrompt(promptId: string): ModelRun[] {
    const rows = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        WHERE p.id = ?
        ORDER BY mr.started_at DESC
      `)
      .all(promptId) as ModelRun[];

    return rows.map((r) => this.enrichRun(r));
  }

  public getRunsForPromptVersion(promptVersionId: string): ModelRun[] {
    const rows = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        WHERE mr.prompt_version_id = ?
        ORDER BY mr.started_at DESC
      `)
      .all(promptVersionId) as ModelRun[];

    return rows.map((r) => this.enrichRun(r));
  }

  public getRunsForModel(modelId: string): ModelRun[] {
    const rows = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        WHERE mr.model_id = ?
        ORDER BY mr.started_at DESC
      `)
      .all(modelId) as ModelRun[];

    return rows.map((r) => this.enrichRun(r));
  }

  public getAllRuns(limit = 100, offset = 0): ModelRun[] {
    const rows = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          pv.prompt_text as prompt_text,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        ORDER BY mr.started_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(limit, offset) as ModelRun[];

    return rows.map((r) => this.enrichRun(r));
  }

  public saveModifiedOutput(input: SaveModifiedOutputInput): Output {
    const newOutputId = uuidv4();
    const orig = this.db
      .prepare('SELECT raw_output FROM outputs WHERE id = ?')
      .get(input.originalOutputId) as { raw_output: string } | undefined;

    const raw = orig ? orig.raw_output : '';

    this.db
      .prepare(`
        INSERT INTO outputs (id, model_run_id, output_type, raw_output, html, is_modified, original_output_id, created_at)
        VALUES (?, ?, 'html', ?, ?, 1, ?, CURRENT_TIMESTAMP)
      `)
      .run(newOutputId, input.modelRunId, raw, input.html, input.originalOutputId);

    return this.db.prepare('SELECT * FROM outputs WHERE id = ?').get(newOutputId) as Output;
  }

  public updateModelRun(
    id: string,
    input: { notes?: string; temperature?: number; topP?: number; maxTokens?: number }
  ): ModelRun {
    this.db
      .prepare(`
        UPDATE model_runs SET
          notes = COALESCE(?, notes),
          temperature = COALESCE(?, temperature),
          top_p = COALESCE(?, top_p),
          max_tokens = COALESCE(?, max_tokens)
        WHERE id = ?
      `)
      .run(
        input.notes ?? null,
        input.temperature ?? null,
        input.topP ?? null,
        input.maxTokens ?? null,
        id
      );

    return this.getRunById(id)!;
  }

  public updateOutput(outputId: string, html: string, rawOutput?: string): Output {
    if (rawOutput !== undefined) {
      this.db
        .prepare('UPDATE outputs SET html = ?, raw_output = ? WHERE id = ?')
        .run(html, rawOutput, outputId);
    } else {
      this.db
        .prepare('UPDATE outputs SET html = ? WHERE id = ?')
        .run(html, outputId);
    }
    return this.db.prepare('SELECT * FROM outputs WHERE id = ?').get(outputId) as Output;
  }

  public deleteModelRun(id: string): void {
    this.db.prepare('DELETE FROM model_runs WHERE id = ?').run(id);
  }

  private enrichRun(run: ModelRun): ModelRun {
    // Fetch latest output (modified if exists, else original)
    const output = this.db
      .prepare(`
        SELECT * FROM outputs 
        WHERE model_run_id = ?
        ORDER BY is_modified DESC, created_at DESC
        LIMIT 1
      `)
      .get(run.id) as Output | undefined;

    // Fetch evaluation
    const evaluation = this.db
      .prepare('SELECT * FROM evaluations WHERE model_run_id = ?')
      .get(run.id) as Evaluation | undefined;

    // Fetch screenshots
    const screenshots = this.db
      .prepare('SELECT * FROM screenshots WHERE model_run_id = ?')
      .all(run.id) as Screenshot[];

    return {
      ...run,
      output,
      evaluation,
      screenshots,
    };
  }
}
