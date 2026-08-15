import { app, BrowserWindow, shell, session, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { Logger } from './utils/logger';
import { initializeDatabase, closeDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/ipcHandlers';
import { IPC_CHANNELS } from './ipc/channels';
import { PromptRepository } from './repositories/promptRepository';
import { ModelRepository } from './repositories/modelRepository';
import { RunRepository } from './repositories/runRepository';
import { EvaluationRepository } from './repositories/evaluationRepository';
import { ComparisonRepository } from './repositories/comparisonRepository';
import { TagRepository } from './repositories/tagRepository';
import { CollectionRepository } from './repositories/collectionRepository';
import { StatsRepository } from './repositories/statsRepository';
import { ExportImportService } from './services/exportImportService';
import { ScreenshotService } from './services/screenshotService';
import { SettingsService } from './services/settingsService';
import { ProviderRegistry } from './providers/providerRegistry';

// Global Process Error Handlers
process.on('uncaughtException', (error) => {
  Logger.error('MAIN PROCESS UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('MAIN PROCESS UNHANDLED REJECTION:', reason);
});

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  Logger.info('Creating main application window...');

  const preloadPath = path.join(__dirname, '../preload/index.js');
  Logger.info('Preload script path:', preloadPath, 'Exists:', fs.existsSync(preloadPath));

  // Resolve application icon across dev and packaged distributions
  const iconCandidates = [
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../build/icon.png'),
    path.join(__dirname, '../../dist/icon.png'),
    path.join(__dirname, '../../assets/icon.svg'),
  ];
  const windowIcon = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'LLM HTML Bench',
    icon: windowIcon,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Track window state changes (maximize/unmaximize) and notify renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, false);
  });

  // Intercept renderer console messages and write to main logger
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] || 'LOG';
    Logger.info(`[RENDERER ${levelName}] (${path.basename(sourceId)}:${line}) ${message}`);
  });

  // Track renderer page loading
  mainWindow.webContents.on('did-finish-load', () => {
    Logger.info('Renderer webContents finished loading successfully.');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    Logger.error(`Renderer failed to load: [${errorCode}] ${errorDescription} at ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    Logger.error('Renderer process gone:', details);
  });

  // Security: prevent main window navigation away from application
  mainWindow.webContents.setWindowOpenHandler((details) => {
    Logger.info('Opening external link in browser:', details.url);
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    Logger.info('Main window ready-to-show. Revealing window.');
    if (mainWindow) {
      mainWindow.show();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    Logger.info(`Loading DevServer URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    const productionHtmlPath = path.join(__dirname, '../../dist/index.html');
    Logger.info(`Loading Production File: ${productionHtmlPath} (Exists: ${fs.existsSync(productionHtmlPath)})`);
    mainWindow.loadFile(productionHtmlPath);
  }

  // Register F12 / DevTools toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools();
      }
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  const logFile = Logger.initialize();
  Logger.info('====================================================');
  Logger.info('Starting LLM HTML Bench Desktop App');
  Logger.info('App Version:', app.getVersion());
  Logger.info('Electron Version:', process.versions.electron);
  Logger.info('Node Version:', process.versions.node);
  Logger.info('Platform:', process.platform, process.arch);
  Logger.info('UserData Path:', app.getPath('userData'));
  Logger.info('Log File:', logFile);
  Logger.info('====================================================');

  try {
    // Initialize Database & Repositories
    Logger.info('Initializing SQLite database and running migrations...');
    const db = initializeDatabase();
    ProviderRegistry.initialize();
    Logger.info('SQLite database initialized successfully.');

    const promptRepo = new PromptRepository(db);
    const modelRepo = new ModelRepository(db);
    const runRepo = new RunRepository(db);
    const evaluationRepo = new EvaluationRepository(db);
    const comparisonRepo = new ComparisonRepository(db);
    const tagRepo = new TagRepository(db);
    const collectionRepo = new CollectionRepository(db);
    const statsRepo = new StatsRepository(db);
    const exportImportService = new ExportImportService(db);
    const screenshotService = new ScreenshotService(db);
    const settingsService = new SettingsService(db);

    Logger.info('Registering IPC handlers...');
    registerIpcHandlers({
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
    });

    // Window controls for custom frameless title bar
    ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
      mainWindow?.minimize();
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow?.maximize();
      }
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
      mainWindow?.close();
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
      return mainWindow?.isMaximized() ?? false;
    });

    Logger.info('IPC handlers registered.');
  } catch (err) {
    Logger.error('CRITICAL ERROR during app initialization:', err);
  }

  // Configure session CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; frame-src 'self' data: blob: *;",
        ],
      },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  Logger.info('All windows closed. Quitting application.');
  closeDatabase();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
