import Database from 'better-sqlite3';
import { Migration } from '../migrator';

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db: Database.Database) => {
    db.exec(`
      -- Prompts table
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'General',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Prompt versions (immutable historical snapshots)
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(prompt_id, version)
      );

      -- Models table
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        model_version TEXT,
        model_family TEXT,
        parameter_count TEXT,
        architecture TEXT,
        quantization TEXT,
        local_or_cloud TEXT CHECK(local_or_cloud IN ('local', 'cloud') OR local_or_cloud IS NULL),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Model runs
      CREATE TABLE IF NOT EXISTS model_runs (
        id TEXT PRIMARY KEY,
        prompt_version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
        model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
        run_number INTEGER NOT NULL DEFAULT 1,
        temperature REAL,
        top_p REAL,
        top_k INTEGER,
        max_tokens INTEGER,
        seed INTEGER,
        reasoning_effort TEXT,
        context_length INTEGER,
        generation_time_ms INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        tokens_per_second REAL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        notes TEXT,
        metadata_json TEXT,
        app_version TEXT NOT NULL,
        provenance TEXT NOT NULL DEFAULT 'manual-paste',
        requested_model_id TEXT,
        resolved_model_id TEXT
      );

      -- Outputs
      CREATE TABLE IF NOT EXISTS outputs (
        id TEXT PRIMARY KEY,
        model_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        output_type TEXT NOT NULL DEFAULT 'html',
        raw_output TEXT NOT NULL,
        html TEXT NOT NULL,
        is_modified INTEGER NOT NULL DEFAULT 0,
        original_output_id TEXT REFERENCES outputs(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Evaluations
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        model_run_id TEXT NOT NULL UNIQUE REFERENCES model_runs(id) ON DELETE CASCADE,
        visual_score REAL,
        prompt_adherence_score REAL,
        functionality_score REAL,
        code_quality_score REAL,
        creativity_score REAL,
        overall_score REAL,
        is_manual_overall INTEGER NOT NULL DEFAULT 0,
        favorite INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Head to head pairwise comparisons
      CREATE TABLE IF NOT EXISTS head_to_head_comparisons (
        id TEXT PRIMARY KEY,
        prompt_version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
        left_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        right_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        winner TEXT NOT NULL CHECK(winner IN ('left', 'right', 'tie')),
        dimension_reason TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tags
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Prompt Tags
      CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY(prompt_id, tag_id)
      );

      -- Collections
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Prompt Collections
      CREATE TABLE IF NOT EXISTS prompt_collections (
        prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        PRIMARY KEY(prompt_id, collection_id)
      );

      -- Screenshots
      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        model_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        viewport_width INTEGER NOT NULL,
        viewport_height INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- App Settings & Encrypted Providers
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
      CREATE INDEX IF NOT EXISTS idx_prompts_archived ON prompts(archived);
      CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);
      CREATE INDEX IF NOT EXISTS idx_model_runs_prompt_version ON model_runs(prompt_version_id);
      CREATE INDEX IF NOT EXISTS idx_model_runs_model ON model_runs(model_id);
      CREATE INDEX IF NOT EXISTS idx_model_runs_started ON model_runs(started_at);
      CREATE INDEX IF NOT EXISTS idx_outputs_model_run ON outputs(model_run_id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_run ON evaluations(model_run_id);
      CREATE INDEX IF NOT EXISTS idx_h2h_version ON head_to_head_comparisons(prompt_version_id);
      CREATE INDEX IF NOT EXISTS idx_h2h_left ON head_to_head_comparisons(left_run_id);
      CREATE INDEX IF NOT EXISTS idx_h2h_right ON head_to_head_comparisons(right_run_id);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);
      CREATE INDEX IF NOT EXISTS idx_models_family ON models(model_family);
    `);
  },
};
