import { ipcMain, dialog, shell, app } from 'electron';
import path from 'path';
import fs from 'fs';
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
import { AutoUpdateService } from '../services/autoUpdateService';
import { ProviderRegistry } from '../providers/providerRegistry';
import { Logger } from '../utils/logger';
import { extractHtml } from '../../shared/utils/htmlExtractor';
import { APP_VERSION } from '../../shared/constants/defaults';
import { LogLevel } from '../../shared/types/ipc';
import { Model } from '../../shared/types/entities';
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
  ipcMain.handle(IPC_CHANNELS.RUNS_UPDATE, (_, id: string, input: any) => runRepo.updateModelRun(id, input));
  ipcMain.handle(IPC_CHANNELS.RUNS_DELETE, (_, id: string) => runRepo.deleteModelRun(id));
  ipcMain.handle(IPC_CHANNELS.RUNS_SAVE_MODIFIED_OUTPUT, (_, input: SaveModifiedOutputInput) =>
    runRepo.saveModifiedOutput(input)
  );
  ipcMain.handle(IPC_CHANNELS.OUTPUTS_UPDATE, (_, outputId: string, html: string, rawOutput?: string) =>
    runRepo.updateOutput(outputId, html, rawOutput)
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
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_REMOVE_PROMPT, (_, promptId: string, colId: string) =>
    collectionRepo.removePromptFromCollection(promptId, colId)
  );

  // Stats
  ipcMain.handle(IPC_CHANNELS.STATS_GET, () => statsRepo.getBenchmarkStats());

  // Provider
  ipcMain.handle(IPC_CHANNELS.PROVIDER_GET_CONFIGS, () => {
    const configs = settingsService.getProviderConfigs();
    Logger.debug('IPC', `Retrieved ${configs.length} provider configuration(s)`);
    return configs;
  });
  ipcMain.handle(IPC_CHANNELS.PROVIDER_SAVE_CONFIG, (_, config: ProviderConfig) => {
    Logger.info('IPC', `Saving provider configuration: "${config.name}" (${config.baseUrl})`);
    return settingsService.saveProviderConfig(config);
  });
  ipcMain.handle(IPC_CHANNELS.PROVIDER_DELETE_CONFIG, (_, configId: string) => {
    Logger.info('IPC', `Deleting provider configuration: ${configId}`);
    return settingsService.deleteProviderConfig(configId);
  });
  ipcMain.handle(IPC_CHANNELS.PROVIDER_TEST, async (_, config: ProviderConfig) => {
    Logger.info('IPC', `Testing provider connection for: "${config.name}" (${config.baseUrl})`);
    const provider = ProviderRegistry.getProvider(config.type);
    if (!provider) return { success: false, error: `No provider found for type: ${config.type}` };
    return provider.testConnection(config);
  });
  ipcMain.handle(IPC_CHANNELS.PROVIDER_FETCH_MODELS, async (_, config: ProviderConfig) => {
    Logger.info('IPC', `Fetching available models for provider: "${config.name}" (${config.baseUrl})`);
    const provider = ProviderRegistry.getProvider(config.type);
    if (!provider || !provider.fetchModels) {
      Logger.warn('IPC', `Provider ${config.type} does not support model discovery`);
      return { success: false, models: [], error: `Provider ${config.type} does not support model discovery` };
    }
    const result = await provider.fetchModels(config);
    if (result.success) {
      Logger.info('IPC', `Successfully discovered ${result.models.length} model(s) for "${config.name}"`);
    } else {
      Logger.warn('IPC', `Model discovery failed for "${config.name}": ${result.error}`);
    }
    return result;
  });
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_EXECUTE_RUN,
    async (
      _,
      request: {
        promptVersionId: string;
        modelId: string;
        providerConfigId: string;
        modelName?: string;
        modelDisplayName?: string;
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      }
    ) => {
      Logger.info(
        'IPC',
        `Executing benchmark run: promptVersion=${request.promptVersionId}, model=${request.modelId}, providerConfig=${request.providerConfigId}`
      );

      const targetVersion = runRepo['db']
        .prepare('SELECT * FROM prompt_versions WHERE id = ?')
        .get(request.promptVersionId) as { prompt_id: string; version: number; prompt_text: string } | undefined;

      if (!targetVersion) {
        Logger.error('IPC', `Prompt version not found: ${request.promptVersionId}`);
        throw new Error(`Prompt version not found (${request.promptVersionId})`);
      }

      const configs = settingsService.getProviderConfigs();
      const config = configs.find((c) => c.id === request.providerConfigId);
      if (!config) {
        Logger.error('IPC', `Provider configuration not found: ${request.providerConfigId}`);
        throw new Error('Provider configuration not found');
      }

      let model: Model | null = modelRepo.getModelById(request.modelId);
      if (!model) {
        const allModels = modelRepo.getModels();
        model =
          allModels.find(
            (m) =>
              m.model_name === request.modelId ||
              m.display_name?.toLowerCase() === request.modelId.toLowerCase()
          ) || null;
      }
      if (!model) {
        // Auto-register model in catalog if it was discovered live
        Logger.info('IPC', `Auto-registering live model in catalog: ${request.modelId}`);
        model = modelRepo.createModel({
          modelName: request.modelName || request.modelId,
          displayName: request.modelDisplayName || request.modelName || request.modelId,
          provider: config.name || 'openai-compatible',
        });
      }

      const provider = ProviderRegistry.getProvider(config.type);
      if (!provider) {
        Logger.error('IPC', `Provider implementation ${config.type} not available`);
        throw new Error(`Provider implementation ${config.type} not available`);
      }

      Logger.info('IPC', `Dispatching generation to provider ${config.name} (${config.baseUrl})...`);
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

      Logger.info('IPC', `Saving generated model run and extracted HTML (${result.extractedHtml.length} chars)...`);
      return runRepo.createModelRun({
        promptVersionId: request.promptVersionId,
        modelId: model.id,
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

  // Documentation
  ipcMain.handle(IPC_CHANNELS.DOCS_GET, () => {
    function readDocFile(filename: string): string {
      const searchPaths = [
        path.join(process.cwd(), filename),
        path.join(__dirname, '../../', filename),
        path.join(path.dirname(process.execPath), filename),
        path.join(process.resourcesPath || '', filename),
        path.join(app.getAppPath(), filename),
      ];
      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          try {
            return fs.readFileSync(p, 'utf-8');
          } catch (err) {
            console.error(`Failed to read doc from ${p}:`, err);
          }
        }
      }
      return `# ${filename}\n\nDocument file could not be located in standard search paths.`;
    }

    return {
      readme: readDocFile('README.md'),
      functionalManual: readDocFile('MANUAL_FUNCTIONAL.md'),
      technicalManual: readDocFile('MANUAL_TECHNICAL.md'),
      versionLog: readDocFile('CHANGELOG.md'),
    };
  });

  ipcMain.handle(IPC_CHANNELS.DOCS_OPEN_FOLDER, () => {
    const candidatePaths = [
      path.join(process.cwd(), 'README.md'),
      path.join(path.dirname(process.execPath), 'README.md'),
      path.join(__dirname, '../../README.md'),
    ];
    const found = candidatePaths.find((p) => fs.existsSync(p));
    if (found) {
      shell.showItemInFolder(found);
    }
  });

  // Application Logging System
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_ENTRIES, () => Logger.getEntries());
  ipcMain.handle(IPC_CHANNELS.LOGS_CLEAR, () => Logger.clear());
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_CONFIG, () => Logger.getLogConfig());
  ipcMain.handle(IPC_CHANNELS.LOGS_SET_AUTO_SAVE, (_, enabled: boolean) => Logger.setAutoSaveToFile(enabled));
  ipcMain.handle(IPC_CHANNELS.LOGS_OPEN_FOLDER, () => {
    const logPath = Logger.getLogConfig().logFilePath;
    if (fs.existsSync(logPath)) {
      shell.showItemInFolder(logPath);
    } else {
      shell.showItemInFolder(Logger.getLogConfig().logDirectory);
    }
  });
  ipcMain.handle(IPC_CHANNELS.LOGS_ADD_ENTRY, (_, level: LogLevel, source: string, message: string, details?: string) => {
    if (level === 'DEBUG') Logger.debug(source, message, details);
    else if (level === 'INFO') Logger.info(source, message, details);
    else if (level === 'WARNING') Logger.warn(source, message, details);
    else if (level === 'ERROR') Logger.error(source, message, details);
  });

  // Auto-Update System
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES, () => AutoUpdateService.checkForUpdates());
  ipcMain.handle(IPC_CHANNELS.UPDATER_QUIT_AND_INSTALL, () => AutoUpdateService.quitAndInstall());

  // System
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    try {
      return app.getVersion() || APP_VERSION;
    } catch {
      return APP_VERSION;
    }
  });
  ipcMain.handle(IPC_CHANNELS.EXTRACT_HTML, (_, raw: string) => extractHtml(raw));
  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (_, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
    }
  });
}
