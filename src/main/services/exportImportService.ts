import Database from 'better-sqlite3';
import fs from 'fs';
import { Prompt, PromptVersion, Model, ModelRun, Output, Evaluation, HeadToHeadComparison, Tag, Collection } from '../../shared/types/entities';
import { DatasetExport } from '../../shared/types/ipc';
import { APP_VERSION } from '../../shared/constants/defaults';

export class ExportImportService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public exportDataset(): DatasetExport {
    const prompts = this.db.prepare('SELECT * FROM prompts ORDER BY created_at ASC').all() as Prompt[];
    const promptVersions = this.db.prepare('SELECT * FROM prompt_versions ORDER BY version ASC').all() as PromptVersion[];
    const models = this.db.prepare('SELECT * FROM models ORDER BY created_at ASC').all() as Model[];
    const runs = this.db.prepare('SELECT * FROM model_runs ORDER BY started_at ASC').all() as ModelRun[];
    const outputs = this.db.prepare('SELECT * FROM outputs ORDER BY created_at ASC').all() as Output[];
    const evaluations = this.db.prepare('SELECT * FROM evaluations ORDER BY created_at ASC').all() as Evaluation[];
    const comparisons = this.db.prepare('SELECT * FROM head_to_head_comparisons ORDER BY created_at ASC').all() as HeadToHeadComparison[];
    const tags = this.db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];
    const collections = this.db.prepare('SELECT * FROM collections ORDER BY name ASC').all() as Collection[];

    return {
      format: 'llm-html-bench',
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      prompts,
      promptVersions,
      models,
      runs,
      outputs,
      evaluations,
      comparisons,
      tags,
      collections,
    };
  }

  public exportDatasetToFile(targetPath: string): { success: boolean; filePath: string } {
    const data = this.exportDataset();
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, filePath: targetPath };
  }

  public importDataset(data: DatasetExport): { success: boolean; importedCount: number } {
    if (data.format !== 'llm-html-bench') {
      throw new Error('Invalid dataset format: expected "llm-html-bench"');
    }

    let count = 0;

    const tx = this.db.transaction(() => {
      // Tags
      if (data.tags) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)');
        for (const t of data.tags) {
          stmt.run(t.id, t.name, t.created_at || new Date().toISOString());
        }
      }

      // Collections
      if (data.collections) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO collections (id, name, description, created_at) VALUES (?, ?, ?, ?)');
        for (const c of data.collections) {
          stmt.run(c.id, c.name, c.description ?? null, c.created_at || new Date().toISOString());
        }
      }

      // Prompts
      if (data.prompts) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO prompts (id, name, description, category, archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of data.prompts) {
          stmt.run(p.id, p.name, p.description ?? null, p.category, p.archived ?? 0, p.created_at, p.updated_at);
          count++;
        }
      }

      // Prompt versions
      if (data.promptVersions) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO prompt_versions (id, prompt_id, version, prompt_text, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const pv of data.promptVersions) {
          stmt.run(pv.id, pv.prompt_id, pv.version, pv.prompt_text, pv.notes ?? null, pv.created_at);
        }
      }

      // Models
      if (data.models) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO models (
            id, provider, model_name, display_name, model_version, model_family,
            parameter_count, architecture, quantization, local_or_cloud, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of data.models) {
          stmt.run(
            m.id,
            m.provider,
            m.model_name,
            m.display_name,
            m.model_version ?? null,
            m.model_family ?? null,
            m.parameter_count ?? null,
            m.architecture ?? null,
            m.quantization ?? null,
            m.local_or_cloud ?? null,
            m.notes ?? null,
            m.created_at
          );
        }
      }

      // Model Runs
      if (data.runs) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO model_runs (
            id, prompt_version_id, model_id, run_number, temperature, top_p, top_k,
            max_tokens, seed, reasoning_effort, context_length, generation_time_ms,
            input_tokens, output_tokens, tokens_per_second, started_at, completed_at,
            notes, metadata_json, app_version, provenance, requested_model_id, resolved_model_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of data.runs) {
          stmt.run(
            r.id,
            r.prompt_version_id,
            r.model_id,
            r.run_number ?? 1,
            r.temperature ?? null,
            r.top_p ?? null,
            r.top_k ?? null,
            r.max_tokens ?? null,
            r.seed ?? null,
            r.reasoning_effort ?? null,
            r.context_length ?? null,
            r.generation_time_ms ?? null,
            r.input_tokens ?? null,
            r.output_tokens ?? null,
            r.tokens_per_second ?? null,
            r.started_at,
            r.completed_at ?? null,
            r.notes ?? null,
            r.metadata_json ?? null,
            r.app_version || APP_VERSION,
            r.provenance || 'import',
            r.requested_model_id ?? null,
            r.resolved_model_id ?? null
          );
        }
      }

      // Outputs
      if (data.outputs) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO outputs (id, model_run_id, output_type, raw_output, html, is_modified, original_output_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const o of data.outputs) {
          stmt.run(
            o.id,
            o.model_run_id,
            o.output_type || 'html',
            o.raw_output,
            o.html,
            o.is_modified ?? 0,
            o.original_output_id ?? null,
            o.created_at
          );
        }
      }

      // Evaluations
      if (data.evaluations) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO evaluations (
            id, model_run_id, visual_score, prompt_adherence_score, functionality_score,
            code_quality_score, creativity_score, overall_score, is_manual_overall, favorite, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const e of data.evaluations) {
          stmt.run(
            e.id,
            e.model_run_id,
            e.visual_score ?? null,
            e.prompt_adherence_score ?? null,
            e.functionality_score ?? null,
            e.code_quality_score ?? null,
            e.creativity_score ?? null,
            e.overall_score ?? null,
            e.is_manual_overall ?? 0,
            e.favorite ?? 0,
            e.notes ?? null,
            e.created_at,
            e.updated_at
          );
        }
      }

      // Head to Head comparisons
      if (data.comparisons) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO head_to_head_comparisons (
            id, prompt_version_id, left_run_id, right_run_id, winner, dimension_reason, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of data.comparisons) {
          stmt.run(
            c.id,
            c.prompt_version_id,
            c.left_run_id,
            c.right_run_id,
            c.winner,
            c.dimension_reason,
            c.notes ?? null,
            c.created_at
          );
        }
      }
    });

    tx();
    return { success: true, importedCount: count };
  }

  public importDatasetFromFile(sourcePath: string): { success: boolean; importedCount: number } {
    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const data = JSON.parse(raw) as DatasetExport;
    return this.importDataset(data);
  }
}
