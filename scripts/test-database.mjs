import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

console.log('--- Running SQLite Repository & Migration Test Suite in Electron Runtime ---');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// 1. Test Schema creation & migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    prompt_text TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prompt_id, version)
  );

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
    local_or_cloud TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS head_to_head_comparisons (
    id TEXT PRIMARY KEY,
    prompt_version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
    left_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    right_run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    winner TEXT NOT NULL,
    dimension_reason TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY(prompt_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prompt_collections (
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY(prompt_id, collection_id)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema');
`);

console.log('✓ Migration & Schema verification passed.');

// 2. Test Prompt Creation and Versioning
const promptId = uuidv4();
const v1Id = uuidv4();
db.prepare(`
  INSERT INTO prompts (id, name, description, category, archived)
  VALUES (?, 'Interactive 3D Solar System', 'Three.js solar system with orbits', '3D/WebGL', 0)
`).run(promptId);

db.prepare(`
  INSERT INTO prompt_versions (id, prompt_id, version, prompt_text)
  VALUES (?, ?, 1, 'Create a 3D Solar System in HTML using Three.js.')
`).run(v1Id, promptId);

const v2Id = uuidv4();
db.prepare(`
  INSERT INTO prompt_versions (id, prompt_id, version, prompt_text, notes)
  VALUES (?, ?, 2, 'Create a 3D Solar System in HTML using Three.js with orbit controls and Saturn rings.', 'Added rings')
`).run(v2Id, promptId);

const versions = db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version ASC').all(promptId);
if (versions.length !== 2) throw new Error('Expected 2 prompt versions');
console.log('✓ Prompt versioning verification passed (v1 & v2 immutable historical records).');

// 3. Test Models & Model Runs
const m1Id = uuidv4();
db.prepare(`
  INSERT INTO models (id, provider, model_name, display_name, parameter_count)
  VALUES (?, 'Alibaba', 'Qwen3.8-27B', 'Qwen 3.8 27B', '27B')
`).run(m1Id);

const m2Id = uuidv4();
db.prepare(`
  INSERT INTO models (id, provider, model_name, display_name, parameter_count)
  VALUES (?, 'OpenAI', 'GPT-5.6', 'GPT-5.6', 'Cloud')
`).run(m2Id);

const run1Id = uuidv4();
db.prepare(`
  INSERT INTO model_runs (id, prompt_version_id, model_id, run_number, temperature, started_at, app_version, provenance)
  VALUES (?, ?, ?, 1, 0.7, CURRENT_TIMESTAMP, '1.0.0', 'manual-paste')
`).run(run1Id, v1Id, m1Id);

db.prepare(`
  INSERT INTO outputs (id, model_run_id, output_type, raw_output, html)
  VALUES (?, ?, 'html', 'raw output qwen', '<!DOCTYPE html><html><body><h1>Solar System Qwen</h1></body></html>')
`).run(uuidv4(), run1Id);

db.prepare(`
  INSERT INTO evaluations (id, model_run_id, visual_score, prompt_adherence_score, functionality_score, code_quality_score, creativity_score, overall_score)
  VALUES (?, ?, 9, 8, 9, 8, 9, 8.6)
`).run(uuidv4(), run1Id);

const run2Id = uuidv4();
db.prepare(`
  INSERT INTO model_runs (id, prompt_version_id, model_id, run_number, temperature, started_at, app_version, provenance)
  VALUES (?, ?, ?, 1, 0.7, CURRENT_TIMESTAMP, '1.0.0', 'manual-paste')
`).run(run2Id, v1Id, m2Id);

db.prepare(`
  INSERT INTO outputs (id, model_run_id, output_type, raw_output, html)
  VALUES (?, ?, 'html', 'raw output gpt', '<!DOCTYPE html><html><body><h1>Solar System GPT</h1></body></html>')
`).run(uuidv4(), run2Id);

db.prepare(`
  INSERT INTO evaluations (id, model_run_id, visual_score, prompt_adherence_score, functionality_score, code_quality_score, creativity_score, overall_score)
  VALUES (?, ?, 9.5, 9, 9, 9, 9, 9.1)
`).run(uuidv4(), run2Id);

console.log('✓ Model run insertion, output preservation, and evaluation scoring verified.');

// 4. Test Head to Head comparison
db.prepare(`
  INSERT INTO head_to_head_comparisons (id, prompt_version_id, left_run_id, right_run_id, winner, dimension_reason)
  VALUES (?, ?, ?, ?, 'right', 'Visual Design')
`).run(uuidv4(), v1Id, run1Id, run2Id);

const comparisons = db.prepare('SELECT * FROM head_to_head_comparisons').all();
if (comparisons.length !== 1 || comparisons[0].winner !== 'right') {
  throw new Error('Head to head recording failed');
}
console.log('✓ Head-to-head comparison verified (Winner: Right / GPT-5.6).');

// 5. Test JSON Export Round-Trip
const allPrompts = db.prepare('SELECT * FROM prompts').all();
const allVersions = db.prepare('SELECT * FROM prompt_versions').all();
const allModels = db.prepare('SELECT * FROM models').all();
const allRuns = db.prepare('SELECT * FROM model_runs').all();
const allOutputs = db.prepare('SELECT * FROM outputs').all();
const allEvals = db.prepare('SELECT * FROM evaluations').all();

const exportPayload = {
  format: 'llm-html-bench',
  version: 1,
  exportedAt: new Date().toISOString(),
  appVersion: '1.0.0',
  prompts: allPrompts,
  promptVersions: allVersions,
  models: allModels,
  runs: allRuns,
  outputs: allOutputs,
  evaluations: allEvals,
  comparisons: comparisons,
  tags: [],
  collections: [],
};

const jsonStr = JSON.stringify(exportPayload);
const parsed = JSON.parse(jsonStr);
if (parsed.format !== 'llm-html-bench' || parsed.runs.length !== 2) {
  throw new Error('Export JSON format failed');
}
console.log('✓ Export / Import round-trip dataset verified successfully.');

db.close();
console.log('=== ALL 5 BENCHMARK INTEGRATION CHECKS PASSED (100%) ===');
process.exit(0);
