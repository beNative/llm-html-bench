export const IPC_CHANNELS = {
  // Prompts
  PROMPTS_GET: 'prompts:get',
  PROMPTS_GET_BY_ID: 'prompts:get-by-id',
  PROMPTS_CREATE: 'prompts:create',
  PROMPTS_UPDATE: 'prompts:update',
  PROMPTS_ARCHIVE: 'prompts:archive',
  PROMPTS_DELETE: 'prompts:delete',
  PROMPTS_CREATE_VERSION: 'prompts:create-version',
  PROMPTS_GET_VERSIONS: 'prompts:get-versions',

  // Models
  MODELS_GET: 'models:get',
  MODELS_GET_BY_ID: 'models:get-by-id',
  MODELS_CREATE: 'models:create',
  MODELS_UPDATE: 'models:update',
  MODELS_DELETE: 'models:delete',

  // Runs
  RUNS_GET_FOR_PROMPT: 'runs:get-for-prompt',
  RUNS_GET_FOR_PROMPT_VERSION: 'runs:get-for-prompt-version',
  RUNS_GET_FOR_MODEL: 'runs:get-for-model',
  RUNS_GET_BY_ID: 'runs:get-by-id',
  RUNS_GET_BY_IDS: 'runs:get-by-ids',
  RUNS_GET_ALL: 'runs:get-all',
  RUNS_CREATE: 'runs:create',
  RUNS_UPDATE: 'runs:update',
  RUNS_DELETE: 'runs:delete',
  RUNS_SAVE_MODIFIED_OUTPUT: 'runs:save-modified-output',
  OUTPUTS_UPDATE: 'outputs:update',

  // Evaluations & Comparisons
  EVALUATIONS_SAVE: 'evaluations:save',
  COMPARISONS_SAVE: 'comparisons:save',
  COMPARISONS_GET_FOR_PROMPT: 'comparisons:get-for-prompt',

  // Tags & Collections
  TAGS_GET: 'tags:get',
  TAGS_CREATE: 'tags:create',
  COLLECTIONS_GET: 'collections:get',
  COLLECTIONS_CREATE: 'collections:create',
  COLLECTIONS_UPDATE: 'collections:update',
  COLLECTIONS_DELETE: 'collections:delete',
  COLLECTIONS_REMOVE_PROMPT: 'collections:remove-prompt',

  // Stats
  STATS_GET: 'stats:get',

  // Provider
  PROVIDER_GET_CONFIGS: 'provider:get-configs',
  PROVIDER_SAVE_CONFIG: 'provider:save-config',
  PROVIDER_TEST: 'provider:test',
  PROVIDER_EXECUTE_RUN: 'provider:execute-run',

  // Database
  DB_GET_INFO: 'db:get-info',
  DB_BACKUP: 'db:backup',
  DB_RESTORE: 'db:restore',
  DB_VACUUM: 'db:vacuum',
  DB_OPEN_FOLDER: 'db:open-folder',

  // Export / Import
  DATASET_EXPORT: 'dataset:export',
  DATASET_EXPORT_TO_FILE: 'dataset:export-to-file',
  DATASET_IMPORT: 'dataset:import',
  DATASET_IMPORT_FROM_FILE: 'dataset:import-from-file',

  // Screenshots
  SCREENSHOT_SAVE: 'screenshot:save',

  // Documentation
  DOCS_GET: 'docs:get',
  DOCS_OPEN_FOLDER: 'docs:open-folder',

  // Window Controls (Frameless Title Bar)
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_STATE_CHANGED: 'window:state-changed',

  // Application Logging System
  LOGS_GET_ENTRIES: 'logs:get-entries',
  LOGS_CLEAR: 'logs:clear',
  LOGS_GET_CONFIG: 'logs:get-config',
  LOGS_SET_AUTO_SAVE: 'logs:set-auto-save',
  LOGS_OPEN_FOLDER: 'logs:open-folder',
  LOGS_ADD_ENTRY: 'logs:add-entry',
  LOGS_NEW_ENTRY_EVENT: 'logs:new-entry-event',

  // Auto-Update System
  UPDATER_CHECK_FOR_UPDATES: 'updater:check-for-updates',
  UPDATER_QUIT_AND_INSTALL: 'updater:quit-and-install',
  UPDATER_STATUS_EVENT: 'updater:status-event',

  // System
  APP_GET_VERSION: 'app:get-version',
  EXTRACT_HTML: 'app:extract-html',
} as const;
