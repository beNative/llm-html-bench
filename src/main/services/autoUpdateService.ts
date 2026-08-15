import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { Logger } from '../utils/logger';
import { IPC_CHANNELS } from '../ipc/channels';
import { UpdateState } from '../../shared/types/ipc';

export class AutoUpdateService {
  private static mainWindow: BrowserWindow | null = null;
  private static isInitialized = false;
  private static currentState: UpdateState = { status: 'idle' };

  public static init(window: BrowserWindow): void {
    this.mainWindow = window;

    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    Logger.info('AUTO_UPDATER', 'Initializing AutoUpdateService...');

    // Configure electron-updater
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // Route electron-updater internal logs through our unified logger
    autoUpdater.logger = {
      info: (msg: any) => Logger.info('AUTO_UPDATER', typeof msg === 'string' ? msg : JSON.stringify(msg)),
      warn: (msg: any) => Logger.warn('AUTO_UPDATER', typeof msg === 'string' ? msg : JSON.stringify(msg)),
      error: (msg: any) => Logger.error('AUTO_UPDATER', typeof msg === 'string' ? msg : JSON.stringify(msg)),
      debug: (msg: any) => Logger.debug('AUTO_UPDATER', typeof msg === 'string' ? msg : JSON.stringify(msg)),
    };

    // 1. Checking for update
    autoUpdater.on('checking-for-update', () => {
      Logger.info('AUTO_UPDATER', 'Checking for software updates on GitHub Releases...');
      this.broadcastState({ status: 'checking' });
    });

    // 2. Update Available
    autoUpdater.on('update-available', (info) => {
      Logger.info('AUTO_UPDATER', `Update available: version ${info.version} (Release date: ${info.releaseDate || 'N/A'})`);
      const notes = typeof info.releaseNotes === 'string' ? info.releaseNotes : null;
      this.broadcastState({
        status: 'available',
        info: {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: notes,
        },
      });
    });

    // 3. Update Not Available (Already on latest version)
    autoUpdater.on('update-not-available', (info) => {
      Logger.info('AUTO_UPDATER', `Application is up-to-date (Current: v${app.getVersion()}, Latest: v${info.version})`);
      this.broadcastState({
        status: 'not-available',
        info: {
          version: info.version,
        },
      });
    });

    // 4. Download Progress
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent * 10) / 10;
      Logger.debug('AUTO_UPDATER', `Download progress: ${percent}% (${progressObj.transferred}/${progressObj.total} bytes @ ${progressObj.bytesPerSecond} B/s)`);
      this.broadcastState({
        status: 'downloading',
        info: this.currentState.info,
        progress: {
          percent,
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
        },
      });
    });

    // 5. Update Downloaded (Ready to install)
    autoUpdater.on('update-downloaded', (info) => {
      Logger.info('AUTO_UPDATER', `Update v${info.version} successfully downloaded and verified!`);
      const notes = typeof info.releaseNotes === 'string' ? info.releaseNotes : null;
      this.broadcastState({
        status: 'downloaded',
        info: {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: notes,
        },
      });
    });

    // 6. Error handling
    autoUpdater.on('error', (err) => {
      const errMsg = err?.message || 'Unknown update error';
      Logger.error('AUTO_UPDATER', `Auto-update error occurred: ${errMsg}`);
      this.broadcastState({
        status: 'error',
        error: errMsg,
      });
    });

    // Schedule initial background check 5 seconds after launch in production
    if (app.isPackaged) {
      setTimeout(() => {
        this.checkForUpdates().catch((err) => {
          Logger.warn('AUTO_UPDATER', `Background startup update check failed: ${err.message}`);
        });
      }, 5000);
    } else {
      Logger.info('AUTO_UPDATER', 'Running in development mode; background auto-updater checks paused.');
    }
  }

  /**
   * Triggers an update check. Returns status message.
   */
  public static async checkForUpdates(): Promise<{ success: boolean; message?: string }> {
    Logger.info('AUTO_UPDATER', 'Explicit update check requested...');

    if (!app.isPackaged) {
      Logger.info('AUTO_UPDATER', 'Development mode: Simulating up-to-date state');
      this.broadcastState({ status: 'checking' });
      setTimeout(() => {
        this.broadcastState({
          status: 'not-available',
          info: { version: app.getVersion() },
        });
      }, 800);
      return {
        success: true,
        message: `Development environment: Current version v${app.getVersion()} is up to date.`,
      };
    }

    try {
      this.broadcastState({ status: 'checking' });
      const result = await autoUpdater.checkForUpdates();
      Logger.info('AUTO_UPDATER', `Update check initiated successfully: ${result ? result.updateInfo.version : 'Complete'}`);
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to check for updates';
      Logger.error('AUTO_UPDATER', `Failed to check for updates: ${errMsg}`);
      this.broadcastState({ status: 'error', error: errMsg });
      return { success: false, message: errMsg };
    }
  }

  /**
   * Quits the application and installs the downloaded update silently.
   */
  public static quitAndInstall(): void {
    Logger.info('AUTO_UPDATER', 'Executing quitAndInstall (silent=true, isRunAfter=true)...');
    try {
      // isSilent: true (no wizard screens), isForceRunAfter: true (automatically launch updated app)
      autoUpdater.quitAndInstall(true, true);
    } catch (err: any) {
      Logger.error('AUTO_UPDATER', `quitAndInstall failed: ${err?.message}`);
    }
  }

  /**
   * Broadcasts the current update state to the renderer process.
   */
  private static broadcastState(state: UpdateState): void {
    this.currentState = state;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS_EVENT, state);
    }
  }

  /**
   * Get the last known update state.
   */
  public static getCurrentState(): UpdateState {
    return this.currentState;
  }
}
