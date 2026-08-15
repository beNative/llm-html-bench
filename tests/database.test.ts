import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { Migrator } from '../src/main/database/migrator';
import { migration001 } from '../src/main/database/migrations/001_initial_schema';
import { PromptRepository } from '../src/main/repositories/promptRepository';
import { ModelRepository } from '../src/main/repositories/modelRepository';
import { RunRepository } from '../src/main/repositories/runRepository';
import { EvaluationRepository } from '../src/main/repositories/evaluationRepository';
import { ComparisonRepository } from '../src/main/repositories/comparisonRepository';
import { StatsRepository } from '../src/main/repositories/statsRepository';
import { ExportImportService } from '../src/main/services/exportImportService';

describe('Database Repositories & Migrations', () => {
  let db: Database.Database;
  let promptRepo: PromptRepository;
  let modelRepo: ModelRepository;
  let runRepo: RunRepository;
  let evaluationRepo: EvaluationRepository;
  let comparisonRepo: ComparisonRepository;
  let statsRepo: StatsRepository;
  let exportImportService: ExportImportService;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new Migrator(db, [migration001]);
    migrator.runMigrations();

    promptRepo = new PromptRepository(db);
    modelRepo = new ModelRepository(db);
    runRepo = new RunRepository(db);
    evaluationRepo = new EvaluationRepository(db);
    comparisonRepo = new ComparisonRepository(db);
    statsRepo = new StatsRepository(db);
    exportImportService = new ExportImportService(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('runs initial migration and sets schema version to 1', () => {
    const row = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number };
    expect(row.v).toBe(1);
  });

  it('creates prompt with version 1 and tags', () => {
    const prompt = promptRepo.createPrompt({
      name: 'Interactive 3D Solar System',
      category: '3D/WebGL',
      promptText: 'Create a Three.js solar system with orbit controls.',
      tags: ['3D', 'ThreeJS', 'WebGL'],
    });

    expect(prompt.id).toBeDefined();
    expect(prompt.name).toBe('Interactive 3D Solar System');
    expect(prompt.category).toBe('3D/WebGL');
    expect(prompt.version_count).toBe(1);
    expect(prompt.latest_version?.version).toBe(1);
    expect(prompt.tags?.length).toBe(3);

    const versions = promptRepo.getPromptVersions(prompt.id);
    expect(versions.length).toBe(1);
    expect(versions[0].prompt_text).toContain('Three.js solar system');
  });

  it('creates immutable prompt version 2 without overwriting historical version', () => {
    const prompt = promptRepo.createPrompt({
      name: 'Pong Game',
      category: 'Games',
      promptText: 'Create a 2D Canvas Pong game.',
    });

    const v2 = promptRepo.createPromptVersion({
      promptId: prompt.id,
      promptText: 'Create a 2D Canvas Pong game with particle effects and sound.',
      notes: 'Added particle effects requirement',
    });

    expect(v2.version).toBe(2);
    expect(v2.notes).toBe('Added particle effects requirement');

    const versions = promptRepo.getPromptVersions(prompt.id);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
  });

  it('creates model and model runs while preserving raw output and extracted HTML', () => {
    const model = modelRepo.createModel({
      provider: 'Alibaba',
      modelName: 'Qwen3.8-27B',
      displayName: 'Qwen 3.8 27B',
      modelFamily: 'Qwen3.8',
      parameterCount: '27B',
      localOrCloud: 'cloud',
    });

    const prompt = promptRepo.createPrompt({
      name: 'Dashboard UI',
      category: 'Dashboards',
      promptText: 'Build a responsive analytics dashboard.',
    });

    const run = runRepo.createModelRun({
      promptVersionId: prompt.latest_version!.id,
      modelId: model.id,
      temperature: 0.7,
      rawOutput: 'Here is the app:\n```html\n<!DOCTYPE html><html><body><h1>Analytics</h1></body></html>\n```\nEnjoy!',
      provenance: 'manual-paste',
      evaluation: {
        visualScore: 9,
        promptAdherenceScore: 8,
        functionalityScore: 9,
        codeQualityScore: 8,
        creativityScore: 9,
      },
    });

    expect(run.id).toBeDefined();
    expect(run.output?.raw_output).toContain('Here is the app:');
    expect(run.output?.html).toBe('<!DOCTYPE html><html><body><h1>Analytics</h1></body></html>');
    expect(run.output?.is_modified).toBe(0);
    expect(run.evaluation?.overall_score).toBe(8.6);

    // Save modified user diagnostic revision
    const modOutput = runRepo.saveModifiedOutput({
      modelRunId: run.id,
      originalOutputId: run.output!.id,
      html: '<!DOCTYPE html><html><body><h1>Analytics (Modified)</h1></body></html>',
    });

    expect(modOutput.is_modified).toBe(1);
    expect(modOutput.original_output_id).toBe(run.output!.id);

    // Update evaluation via repo
    evaluationRepo.saveEvaluation({
      modelRunId: run.id,
      visualScore: 10,
      promptAdherenceScore: 9,
      functionalityScore: 10,
      codeQualityScore: 9,
      creativityScore: 10,
      overallScore: 9.6,
      isManualOverall: false,
      favorite: true,
      notes: 'Superb revision',
    });

    // Fetching run should now return enriched with latest modified output and updated eval
    const refetched = runRepo.getRunById(run.id);
    expect(refetched?.output?.is_modified).toBe(1);
    expect(refetched?.output?.html).toContain('Modified');
    expect(refetched?.evaluation?.overall_score).toBe(9.6);
  });

  it('records head to head comparisons and calculates benchmark stats', () => {
    const m1 = modelRepo.createModel({ provider: 'OpenAI', modelName: 'GPT-5.6', displayName: 'GPT-5.6' });
    const m2 = modelRepo.createModel({ provider: 'Alibaba', modelName: 'Qwen3.8-27B', displayName: 'Qwen3.8-27B' });

    const prompt = promptRepo.createPrompt({
      name: '3D City',
      category: '3D/WebGL',
      promptText: 'Generate an interactive 3D city.',
    });

    const run1 = runRepo.createModelRun({
      promptVersionId: prompt.latest_version!.id,
      modelId: m1.id,
      rawOutput: '<html><body>City 1</body></html>',
      provenance: 'manual-paste',
      evaluation: { visualScore: 9, functionalityScore: 9 },
    });

    const run2 = runRepo.createModelRun({
      promptVersionId: prompt.latest_version!.id,
      modelId: m2.id,
      rawOutput: '<html><body>City 2</body></html>',
      provenance: 'manual-paste',
      evaluation: { visualScore: 8, functionalityScore: 8 },
    });

    const h2h = comparisonRepo.saveHeadToHeadComparison({
      promptVersionId: prompt.latest_version!.id,
      leftRunId: run1.id,
      rightRunId: run2.id,
      winner: 'left',
      dimensionReason: 'Visual Design',
    });

    expect(h2h.id).toBeDefined();
    expect(h2h.winner).toBe('left');
    expect(h2h.left_model_name).toBe('GPT-5.6');

    const stats = statsRepo.getBenchmarkStats();
    expect(stats.total_prompts).toBe(1);
    expect(stats.total_models).toBe(2);
    expect(stats.total_runs).toBe(2);
    expect(stats.total_comparisons).toBe(1);

    const gptRanking = stats.model_rankings.find((r) => r.model_id === m1.id);
    expect(gptRanking?.win_rate).toBe(100);
    expect(gptRanking?.head_to_head_wins).toBe(1);
  });

  it('exports and imports dataset accurately', () => {
    promptRepo.createPrompt({
      name: 'Export Test Prompt',
      category: 'General',
      promptText: 'Test export.',
    });

    const exportData = exportImportService.exportDataset();
    expect(exportData.prompts.length).toBe(1);
    expect(exportData.format).toBe('llm-html-bench');

    // Create a new fresh DB and import
    const db2 = new Database(':memory:');
    new Migrator(db2, [migration001]).runMigrations();
    const service2 = new ExportImportService(db2);

    const importResult = service2.importDataset(exportData);
    expect(importResult.success).toBe(true);
    expect(importResult.importedCount).toBe(1);

    const importedPrompts = new PromptRepository(db2).getPrompts();
    expect(importedPrompts.length).toBe(1);
    expect(importedPrompts[0].name).toBe('Export Test Prompt');

    db2.close();
  });
});
