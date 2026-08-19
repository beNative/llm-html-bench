import {
  Prompt,
  PromptVersion,
  Model,
  ModelRun,
  Output,
  Evaluation,
  HeadToHeadComparison,
  Tag,
  Collection,
  BenchmarkStats,
  Screenshot,
} from './entities';
import { ProviderConfig } from './providers';

export interface CreatePromptInput {
  name: string;
  description?: string;
  category: string;
  promptText: string;
  notes?: string;
  tags?: string[];
  collectionIds?: string[];
}

export interface UpdatePromptInput {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  collectionIds?: string[];
}

export interface CreatePromptVersionInput {
  promptId: string;
  promptText: string;
  notes?: string;
}

export interface CreateModelInput {
  provider: string;
  modelName: string;
  displayName: string;
  modelVersion?: string;
  modelFamily?: string;
  parameterCount?: string;
  architecture?: string;
  quantization?: string;
  localOrCloud?: 'local' | 'cloud';
  contextWindow?: string;
  isReasoningModel?: boolean | number;
  aaIntelligenceIndex?: number;
  aaEvaluationsJson?: string;
  aaModelId?: string;
  notes?: string;
}

export interface UpdateModelInput {
  provider?: string;
  modelName?: string;
  displayName?: string;
  modelVersion?: string;
  modelFamily?: string;
  parameterCount?: string;
  architecture?: string;
  quantization?: string;
  localOrCloud?: 'local' | 'cloud';
  contextWindow?: string;
  isReasoningModel?: boolean | number;
  aaIntelligenceIndex?: number;
  aaEvaluationsJson?: string;
  aaModelId?: string;
  notes?: string;
}

export interface ArtificialAnalysisModelBenchmark {
  modelId: string;
  name: string;
  provider: string;
  intelligenceIndex?: number;
  evaluations?: {
    gpqa?: number;
    math?: number;
    coding?: number;
    throughputTokSec?: number;
    priceInputPer1M?: number;
    priceOutputPer1M?: number;
    [key: string]: unknown;
  };
  contextWindow?: string;
  notes?: string;
}

export interface CreateModelRunInput {
  promptVersionId: string;
  modelId: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  seed?: number;
  reasoningEffort?: string;
  contextLength?: number;
  generationTimeMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSecond?: number;
  notes?: string;
  metadataJson?: string;
  rawOutput: string;
  html?: string;
  provenance: 'manual-paste' | 'api' | 'import';
  requestedModelId?: string;
  resolvedModelId?: string;
  evaluation?: {
    visualScore?: number;
    promptAdherenceScore?: number;
    functionalityScore?: number;
    codeQualityScore?: number;
    creativityScore?: number;
    overallScore?: number;
    isManualOverall?: boolean;
    favorite?: boolean;
    notes?: string;
  };
}

export interface SaveEvaluationInput {
  modelRunId: string;
  visualScore: number | null;
  promptAdherenceScore: number | null;
  functionalityScore: number | null;
  codeQualityScore: number | null;
  creativityScore: number | null;
  overallScore: number | null;
  isManualOverall: boolean;
  favorite: boolean;
  notes: string | null;
}

export interface SaveHeadToHeadInput {
  promptVersionId: string;
  leftRunId: string;
  rightRunId: string;
  winner: 'left' | 'right' | 'tie';
  dimensionReason:
    | 'Visual Design'
    | 'Functionality'
    | 'Prompt Adherence'
    | 'Performance'
    | 'Code Quality'
    | 'Overall Preference';
  notes?: string;
}

export interface SaveModifiedOutputInput {
  modelRunId: string;
  html: string;
  originalOutputId: string;
}

export interface DatasetExport {
  format: 'llm-html-bench';
  version: number;
  exportedAt: string;
  appVersion: string;
  prompts: Prompt[];
  promptVersions: PromptVersion[];
  models: Model[];
  runs: ModelRun[];
  outputs: Output[];
  evaluations: Evaluation[];
  comparisons: HeadToHeadComparison[];
  tags: Tag[];
  collections: Collection[];
}

export interface DatabaseInfo {
  filePath: string;
  sizeBytes: number;
  version: number;
  counts: {
    prompts: number;
    promptVersions: number;
    models: number;
    runs: number;
    outputs: number;
    evaluations: number;
    comparisons: number;
  };
}

export interface ElectronAPI {
  // Prompts
  getPrompts: (filter?: {
    search?: string;
    category?: string;
    tagId?: string;
    collectionId?: string;
    archived?: boolean;
    sortBy?: 'name' | 'created_at' | 'last_tested' | 'run_count';
    sortOrder?: 'asc' | 'desc';
  }) => Promise<Prompt[]>;
  getPromptById: (id: string) => Promise<Prompt | null>;
  createPrompt: (input: CreatePromptInput) => Promise<Prompt>;
  updatePrompt: (input: UpdatePromptInput) => Promise<Prompt>;
  archivePrompt: (id: string, archived: boolean) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  createPromptVersion: (input: CreatePromptVersionInput) => Promise<PromptVersion>;
  getPromptVersions: (promptId: string) => Promise<PromptVersion[]>;

  // Models
  getModels: () => Promise<Model[]>;
  getModelById: (id: string) => Promise<Model | null>;
  createModel: (input: CreateModelInput) => Promise<Model>;
  updateModel: (id: string, input: Partial<CreateModelInput>) => Promise<Model>;
  deleteModel: (id: string) => Promise<void>;

  // Model Runs & Outputs
  getRunsForPrompt: (promptId: string) => Promise<ModelRun[]>;
  getRunsForPromptVersion: (promptVersionId: string) => Promise<ModelRun[]>;
  getRunsForModel: (modelId: string) => Promise<ModelRun[]>;
  getRunById: (id: string) => Promise<ModelRun | null>;
  getRunsByIds: (ids: string[]) => Promise<ModelRun[]>;
  getAllRuns: (limit?: number, offset?: number) => Promise<ModelRun[]>;
  createModelRun: (input: CreateModelRunInput) => Promise<ModelRun>;
  updateModelRun: (id: string, input: { notes?: string; temperature?: number; topP?: number; maxTokens?: number }) => Promise<ModelRun>;
  deleteModelRun: (id: string) => Promise<void>;
  saveModifiedOutput: (input: SaveModifiedOutputInput) => Promise<Output>;
  updateOutput: (outputId: string, html: string, rawOutput?: string) => Promise<Output>;

  // Evaluations & Comparisons
  saveEvaluation: (input: SaveEvaluationInput) => Promise<Evaluation>;
  saveHeadToHeadComparison: (input: SaveHeadToHeadInput) => Promise<HeadToHeadComparison>;
  getComparisonsForPrompt: (promptVersionId?: string) => Promise<HeadToHeadComparison[]>;

  // Tags & Collections
  getTags: () => Promise<Tag[]>;
  createTag: (name: string) => Promise<Tag>;
  getCollections: () => Promise<Collection[]>;
  createCollection: (name: string, description?: string) => Promise<Collection>;
  updateCollection: (id: string, name: string, description?: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  removePromptFromCollection: (promptId: string, collectionId: string) => Promise<void>;

  // Dashboard & Stats
  getBenchmarkStats: () => Promise<BenchmarkStats>;

  // Provider / Execution
  getProviderConfigs: () => Promise<ProviderConfig[]>;
  saveProviderConfig: (config: ProviderConfig) => Promise<void>;
  deleteProviderConfig: (configId: string) => Promise<void>;
  testProviderConnection: (config: ProviderConfig) => Promise<{ success: boolean; error?: string }>;
  fetchProviderModels: (config: ProviderConfig) => Promise<{ success: boolean; models: Array<{ id: string; name: string; ownedBy?: string }>; error?: string }>;
  executeBenchmarkRun: (request: {
    requestId?: string;
    promptVersionId: string;
    modelId: string;
    providerConfigId: string;
    modelName?: string;
    modelDisplayName?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  }) => Promise<ModelRun>;
  cancelBenchmarkRun: (requestId?: string) => Promise<void>;
  onStreamChunk: (callback: (data: { requestId: string; delta: string; accumulated: string }) => void) => () => void;
  onStreamStatus: (callback: (status: { requestId: string; state: 'started' | 'streaming' | 'extracting' | 'completed' | 'error'; error?: string }) => void) => () => void;

  // Artificial Analysis Benchmark Intelligence
  fetchArtificialAnalysisModels: (apiKey?: string) => Promise<{ success: boolean; models: ArtificialAnalysisModelBenchmark[]; error?: string }>;
  fetchModelBenchmarks: (modelName: string, provider?: string, apiKey?: string) => Promise<{ success: boolean; benchmark?: ArtificialAnalysisModelBenchmark; error?: string }>;
  syncAllModelBenchmarks: (apiKey?: string) => Promise<{ success: boolean; updatedCount: number; message?: string }>;

  // Database Management & Backup
  getDatabaseInfo: () => Promise<DatabaseInfo>;
  backupDatabase: (targetPath?: string) => Promise<{ success: boolean; filePath: string }>;
  restoreDatabase: (sourcePath: string) => Promise<{ success: boolean }>;
  vacuumDatabase: () => Promise<void>;
  openDatabaseFolder: () => Promise<void>;

  // Export / Import
  exportDataset: () => Promise<DatasetExport>;
  exportDatasetToFile: (targetPath?: string) => Promise<{ success: boolean; filePath: string }>;
  importDataset: (data: DatasetExport) => Promise<{ success: boolean; importedCount: number }>;
  importDatasetFromFile: (sourcePath?: string) => Promise<{ success: boolean; importedCount: number }>;

  // Screenshots
  saveScreenshot: (runId: string, base64Data: string, width: number, height: number) => Promise<Screenshot>;

  // Documentation
  getDocs: () => Promise<DocumentationDocs>;
  openDocsFolder: () => Promise<void>;

  // Window Controls (Frameless Title Bar)
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => () => void;

  // Application Logging System
  getLogs: () => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  getLogConfig: () => Promise<LogConfig>;
  setLogAutoSave: (enabled: boolean) => Promise<{ success: boolean; logFilePath: string }>;
  openLogFolder: () => Promise<void>;
  addLog: (level: LogLevel, source: string, message: string, details?: string) => Promise<void>;
  onNewLog: (callback: (entry: LogEntry) => void) => () => void;

  // Auto-Update System
  checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
  quitAndInstallUpdate: () => Promise<void>;
  onUpdateStateChange: (callback: (state: UpdateState) => void) => () => void;

  // System
  getAppVersion: () => Promise<string>;
  extractHtml: (raw: string) => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | null;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateState {
  status: UpdateStatus;
  info?: UpdateInfo;
  progress?: UpdateProgress;
  error?: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string; // Full ISO string
  timeFormatted: string; // HH:mm:ss.SSS
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
}

export interface LogConfig {
  autoSaveToFile: boolean;
  logFilePath: string;
  logFileName: string;
  logDirectory: string;
}

export interface DocumentationDocs {
  readme: string;
  functionalManual: string;
  technicalManual: string;
  versionLog: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
