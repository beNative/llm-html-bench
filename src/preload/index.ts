import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../shared/types/ipc';
import { IPC_CHANNELS } from '../main/ipc/channels';

const api: ElectronAPI = {
  // Prompts
  getPrompts: (filter) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET, filter),
  getPromptById: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET_BY_ID, id),
  createPrompt: (input) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_CREATE, input),
  updatePrompt: (input) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_UPDATE, input),
  archivePrompt: (id, archived) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_ARCHIVE, id, archived),
  deletePrompt: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_DELETE, id),
  createPromptVersion: (input) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_CREATE_VERSION, input),
  getPromptVersions: (promptId) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET_VERSIONS, promptId),

  // Models
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.MODELS_GET),
  getModelById: (id) => ipcRenderer.invoke(IPC_CHANNELS.MODELS_GET_BY_ID, id),
  createModel: (input) => ipcRenderer.invoke(IPC_CHANNELS.MODELS_CREATE, input),
  updateModel: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.MODELS_UPDATE, id, input),
  deleteModel: (id) => ipcRenderer.invoke(IPC_CHANNELS.MODELS_DELETE, id),

  // Model Runs & Outputs
  getRunsForPrompt: (promptId) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_FOR_PROMPT, promptId),
  getRunsForPromptVersion: (pvId) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_FOR_PROMPT_VERSION, pvId),
  getRunsForModel: (modelId) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_FOR_MODEL, modelId),
  getRunById: (id) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_BY_ID, id),
  getRunsByIds: (ids) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_BY_IDS, ids),
  getAllRuns: (limit, offset) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_GET_ALL, limit, offset),
  createModelRun: (input) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_CREATE, input),
  updateModelRun: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_UPDATE, id, input),
  deleteModelRun: (id) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_DELETE, id),
  saveModifiedOutput: (input) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_SAVE_MODIFIED_OUTPUT, input),
  updateOutput: (outputId, html, rawOutput) => ipcRenderer.invoke(IPC_CHANNELS.OUTPUTS_UPDATE, outputId, html, rawOutput),

  // Evaluations & Comparisons
  saveEvaluation: (input) => ipcRenderer.invoke(IPC_CHANNELS.EVALUATIONS_SAVE, input),
  saveHeadToHeadComparison: (input) => ipcRenderer.invoke(IPC_CHANNELS.COMPARISONS_SAVE, input),
  getComparisonsForPrompt: (pvId) => ipcRenderer.invoke(IPC_CHANNELS.COMPARISONS_GET_FOR_PROMPT, pvId),

  // Tags & Collections
  getTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAGS_GET),
  createTag: (name) => ipcRenderer.invoke(IPC_CHANNELS.TAGS_CREATE, name),
  getCollections: () => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_GET),
  createCollection: (name, desc) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_CREATE, name, desc),
  updateCollection: (id, name, desc) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_UPDATE, id, name, desc),
  deleteCollection: (id) => ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DELETE, id),
  removePromptFromCollection: (promptId, colId) =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_REMOVE_PROMPT, promptId, colId),

  // Dashboard & Stats
  getBenchmarkStats: () => ipcRenderer.invoke(IPC_CHANNELS.STATS_GET),

  // Provider / Execution
  getProviderConfigs: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_GET_CONFIGS),
  saveProviderConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SAVE_CONFIG, config),
  testProviderConnection: (config) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_TEST, config),
  executeBenchmarkRun: (req) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_EXECUTE_RUN, req),

  // Database Management
  getDatabaseInfo: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_INFO),
  backupDatabase: (targetPath) => ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP, targetPath),
  restoreDatabase: (sourcePath) => ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE, sourcePath),
  vacuumDatabase: () => ipcRenderer.invoke(IPC_CHANNELS.DB_VACUUM),
  openDatabaseFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DB_OPEN_FOLDER),

  // Export / Import
  exportDataset: () => ipcRenderer.invoke(IPC_CHANNELS.DATASET_EXPORT),
  exportDatasetToFile: (targetPath) => ipcRenderer.invoke(IPC_CHANNELS.DATASET_EXPORT_TO_FILE, targetPath),
  importDataset: (data) => ipcRenderer.invoke(IPC_CHANNELS.DATASET_IMPORT, data),
  importDatasetFromFile: (sourcePath) => ipcRenderer.invoke(IPC_CHANNELS.DATASET_IMPORT_FROM_FILE, sourcePath),

  // Screenshots
  saveScreenshot: (runId, base64, w, h) => ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_SAVE, runId, base64, w, h),

  // Documentation
  getDocs: () => ipcRenderer.invoke(IPC_CHANNELS.DOCS_GET),
  openDocsFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DOCS_OPEN_FOLDER),

  // Window Controls (Frameless Title Bar)
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isWindowMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
    };
  },

  // Application Logging System
  getLogs: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_ENTRIES),
  clearLogs: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_CLEAR),
  getLogConfig: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_CONFIG),
  setLogAutoSave: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_SET_AUTO_SAVE, enabled),
  openLogFolder: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_OPEN_FOLDER),
  addLog: (level, source, message, details) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_ADD_ENTRY, level, source, message, details),
  onNewLog: (callback) => {
    const handler = (_: any, entry: any) => callback(entry);
    ipcRenderer.on(IPC_CHANNELS.LOGS_NEW_ENTRY_EVENT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LOGS_NEW_ENTRY_EVENT, handler);
    };
  },

  // Auto-Update System
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK_FOR_UPDATES),
  quitAndInstallUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_QUIT_AND_INSTALL),
  onUpdateStateChange: (callback) => {
    const handler = (_: any, state: any) => callback(state);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_EVENT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS_EVENT, handler);
    };
  },

  // System
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  extractHtml: (raw) => ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_HTML, raw),
};

contextBridge.exposeInMainWorld('electronAPI', api);
