import { ipcMain, dialog, shell } from 'electron';
import { IPC_CHANNELS } from './channels';
import { PromptRepository } from '../repositories/promptRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { RunRepository } from '../repositories/runRepository';
import { EvaluationRepository } from '../repositories/evaluationRepository';
import { ComparisonRepository } from '../repositories/comparisonRepository';
import { TagRepository } from '../repositories/tagRepository';
import { CollectionRepository } from '../repositories/collectionRepository';
import { StatsRepository } from '../repositories/statsRepository';
import { ExportImportService } from '../services/exportImportService';
import { ScreenshotService } from '../services/screenshotService';
import { SettingsService } from '../services/settingsService';
import { ProviderRegistry } from '../providers/providerRegistry';
import { extractHtml } from '../../shared/utils/htmlExtractor';
import { APP_VERSION } from '../../shared/constants/defaults';
import {
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput,
  CreateModelInput,
  CreateModelRunInput,
  SaveEvaluationInput,
  SaveHeadToHeadInput,
  SaveModifiedOutputInput,
  DatasetExport,
} from '../../shared/types/ipc';
import { ProviderConfig } from '../../shared/types/providers';
import { getDatabasePath } from '../database/connection';

export function registerIpcHandlers(services: {
  promptRepo: PromptRepository;
  modelRepo: ModelRepository;
  runRepo: RunRepository;
  evaluationRepo: EvaluationRepository;
  comparisonRepo: ComparisonRepository;
  tagRepo: TagRepository;
  collectionRepo: CollectionRepository;
  statsRepo: StatsRepository;
  exportImportService: ExportImportService;
  screenshotService: ScreenshotService;
  settingsService: SettingsService;
}): void {
  const {
    promptRepo,
    modelRepo,
    runRepo,
    evaluationRepo,
    comparisonRepo,
    tagRepo,
    collectionRepo,
    statsRepo,
    exportImportService,
    screenshotService,
    settingsService,
  } = services;

  // Prompts
  ipcMain.handle(IPC_CHANNELS.PROMPTS_GET, (_, filter) => promptRepo.getPrompts(filter));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_GET_BY_ID, (_, id: string) => promptRepo.getPromptById(id));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_CREATE, (_, input: CreatePromptInput) => promptRepo.createPrompt(input));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_UPDATE, (_, input: UpdatePromptInput) => promptRepo.updatePrompt(input));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_ARCHIVE, (_, id: string, archived: boolean) => promptRepo.archivePrompt(id, archived));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_DELETE, (_, id: string) => promptRepo.deletePrompt(id));
  ipcMain.handle(IPC_CHANNELS.PROMPTS_CREATE_VERSION, (_, input: CreatePromptVersionInput) =>
    promptRepo.createPromptVersion(input)
  );
  ipcMain.handle(IPC_CHANNELS.PROMPTS_GET_VERSIONS, (_, promptId: string) => promptRepo.getPromptVersions(promptId));

  // Models
  ipcMain.handle(IPC_CHANNELS.MODELS_GET, () => modelRepo.getModels());
  ipcMain.handle(IPC_CHANNELS.MODELS_GET_BY_ID, (_, id: string) => modelRepo.getModelById(id));
  ipcMain.handle(IPC_CHANNELS.MODELS_CREATE, (_, input: CreateModelInput) => modelRepo.createModel(input));
  ipcMain.handle(IPC_CHANNELS.MODELS_UPDATE, (_, id: string, input: Partial<CreateModelInput>) =>
    modelRepo.updateModel(id, input)
  );
  ipcMain.handle(IPC_CHANNELS.MODELS_DELETE, (_, id: string) => modelRepo.deleteModel(id));

  // Model Runs
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_FOR_PROMPT, (_, promptId: string) => runRepo.getRunsForPrompt(promptId));
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_FOR_PROMPT_VERSION, (_, pvId: string) => runRepo.getRunsForPromptVersion(pvId));
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_FOR_MODEL, (_, modelId: string) => runRepo.getRunsForModel(modelId));
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_BY_ID, (_, id: string) => runRepo.getRunById(id));
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_BY_IDS, (_, ids: string[]) => runRepo.getRunsByIds(ids));
  ipcMain.handle(IPC_CHANNELS.RUNS_GET_ALL, (_, limit?: number, offset?: number) => runRepo.getAllRuns(limit, offset));
  ipcMain.handle(IPC_CHANNELS.RUNS_CREATE, (_, input: CreateModelRunInput) => runRepo.createModelRun(input));
  ipcMain.handle(IPC_CHANNELS.RUNS_DELETE, (_, id: string) => runRepo.deleteModelRun(id));
  ipcMain.handle(IPC_CHANNELS.RUNS_SAVE_MODIFIED_OUTPUT, (_, input: SaveModifiedOutputInput) =>
    runRepo.saveModifiedOutput(input)
  );

  // Evaluations & Comparisons
  ipcMain.handle(IPC_CHANNELS.EVALUATIONS_SAVE, (_, input: SaveEvaluationInput) => evaluationRepo.saveEvaluation(input));
  ipcMain.handle(IPC_CHANNELS.COMPARISONS_SAVE, (_, input: SaveHeadToHeadInput) =>
    comparisonRepo.saveHeadToHeadComparison(input)
  );
  ipcMain.handle(IPC_CHANNELS.COMPARISONS_GET_FOR_PROMPT, (_, pvId?: string) =>
    comparisonRepo.getComparisonsForPrompt(pvId)
  );

  // Tags & Collections
  ipcMain.handle(IPC_CHANNELS.TAGS_GET, () => tagRepo.getTags());
  ipcMain.handle(IPC_CHANNELS.TAGS_CREATE, (_, name: string) => tagRepo.createTag(name));
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_GET, () => collectionRepo.getCollections());
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_CREATE, (_, name: string, desc?: string) =>
    collectionRepo.createCollection(name, desc)
  );
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_UPDATE, (_, id: string, name: string, desc?: string) =>
    collectionRepo.updateCollection(id, name, desc)
  );
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DELETE, (_, id: string) => collectionRepo.deleteCollection(id));

  // Stats
  ipcMain.handle(IPC_CHANNELS.STATS_GET, () => statsRepo.getBenchmarkStats());

  // Provider
  ipcMain.handle(IPC_CHANNELS.PROVIDER_GET_CONFIGS, () => settingsService.getProviderConfigs());
  ipcMain.handle(IPC_CHANNELS.PROVIDER_SAVE_CONFIG, (_, config: ProviderConfig) =>
    settingsService.saveProviderConfig(config)
  );
  ipcMain.handle(IPC_CHANNELS.PROVIDER_TEST, async (_, config: ProviderConfig) => {
    const provider = ProviderRegistry.getProvider(config.type);
    if (!provider) return { success: false, error: `No provider found for type: ${config.type}` };
    return provider.testConnection(config);
  });
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_EXECUTE_RUN,
    async (
      _,
      request: {
        promptVersionId: string;
        modelId: string;
        providerConfigId: string;
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      }
    ) => {
      const promptVersions = promptRepo.getPromptVersions(
        (
          runRepo['db'].prepare('SELECT prompt_id FROM prompt_versions WHERE id = ?').get(request.promptVersionId) as {
            prompt_id: string;
          }
        ).prompt_id
      );
      const targetVersion = promptVersions.find((pv) => pv.id === request.promptVersionId);
      if (!targetVersion) {
        throw new Error('Prompt version not found');
      }

      const model = modelRepo.getModelById(request.modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      const configs = settingsService.getProviderConfigs();
      const config = configs.find((c) => c.id === request.providerConfigId);
      if (!config) {
        throw new Error('Provider configuration not found');
      }

      const provider = ProviderRegistry.getProvider(config.type);
      if (!provider) {
        throw new Error(`Provider implementation ${config.type} not available`);
      }

      const result = await provider.generate(
        {
          promptText: targetVersion.prompt_text,
          modelId: model.model_name,
          temperature: request.temperature,
          topP: request.topP,
          maxTokens: request.maxTokens,
        },
        config
      );

      return runRepo.createModelRun({
        promptVersionId: request.promptVersionId,
        modelId: request.modelId,
        temperature: request.temperature,
        topP: request.topP,
        maxTokens: request.maxTokens,
        generationTimeMs: result.generationTimeMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        tokensPerSecond: result.tokensPerSecond,
        rawOutput: result.rawOutput,
        html: result.extractedHtml,
        provenance: 'api',
        requestedModelId: result.requestedModelId,
        resolvedModelId: result.resolvedModelId,
        metadataJson: JSON.stringify(result.metadata || {}),
      });
    }
  );

  // Database
  ipcMain.handle(IPC_CHANNELS.DB_GET_INFO, () => settingsService.getDatabaseInfo());
  ipcMain.handle(IPC_CHANNELS.DB_BACKUP, async (_, targetPath?: string) => {
    let finalPath = targetPath;
    if (!finalPath) {
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Backup Benchmark Database',
        defaultPath: `benchmark_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
        filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      });
      if (canceled || !filePath) return { success: false, filePath: '' };
      finalPath = filePath;
    }
    return settingsService.backupDatabase(finalPath);
  });
  ipcMain.handle(IPC_CHANNELS.DB_RESTORE, async (_, sourcePath?: string) => {
    let finalPath = sourcePath;
    if (!finalPath) {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Restore Benchmark Database',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
        properties: ['openFile'],
      });
      if (canceled || filePaths.length === 0) return { success: false };
      finalPath = filePaths[0];
    }
    return settingsService.restoreDatabase(finalPath);
  });
  ipcMain.handle(IPC_CHANNELS.DB_VACUUM, () => settingsService.vacuumDatabase());
  ipcMain.handle(IPC_CHANNELS.DB_OPEN_FOLDER, () => {
    const dbPath = getDatabasePath();
    shell.showItemInFolder(dbPath);
  });

  // Export / Import
  ipcMain.handle(IPC_CHANNELS.DATASET_EXPORT, () => exportImportService.exportDataset());
  ipcMain.handle(IPC_CHANNELS.DATASET_EXPORT_TO_FILE, async (_, targetPath?: string) => {
    let finalPath = targetPath;
    if (!finalPath) {
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Benchmark Dataset',
        defaultPath: `llm_html_bench_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
        filters: [{ name: 'JSON Dataset', extensions: ['json'] }],
      });
      if (canceled || !filePath) return { success: false, filePath: '' };
      finalPath = filePath;
    }
    return exportImportService.exportDatasetToFile(finalPath);
  });
  ipcMain.handle(IPC_CHANNELS.DATASET_IMPORT, (_, data: DatasetExport) => exportImportService.importDataset(data));
  ipcMain.handle(IPC_CHANNELS.DATASET_IMPORT_FROM_FILE, async (_, sourcePath?: string) => {
    let finalPath = sourcePath;
    if (!finalPath) {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Import Benchmark Dataset',
        filters: [{ name: 'JSON Dataset', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (canceled || filePaths.length === 0) return { success: false, importedCount: 0 };
      finalPath = filePaths[0];
    }
    return exportImportService.importDatasetFromFile(finalPath);
  });

  // Screenshots
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_SAVE, (_, runId: string, base64: string, w: number, h: number) =>
    screenshotService.saveScreenshot(runId, base64, w, h)
  );

  // System
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => APP_VERSION);
  ipcMain.handle(IPC_CHANNELS.EXTRACT_HTML, (_, raw: string) => extractHtml(raw));
}
