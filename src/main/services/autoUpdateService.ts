import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { Logger } from '../utils/logger';
import { IPC_CHANNELS } from '../ipc/channels';
import { UpdateState } from '../../shared/types/ipc';

export class AutoUpdateService {
  private static mainWindow: BrowserWindow | null = null;
  private static isInitialized = false;
  private static currentState: UpdateState = { status: 'idle' };
  private static isManualCheck = false;

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
      if (this.isManualCheck) {
        this.broadcastState({ status: 'checking' });
      }
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
      if (this.isManualCheck) {
        this.broadcastState({
          status: 'not-available',
          info: {
            version: info.version,
          },
        });
      } else {
        this.currentState = { status: 'idle' };
      }
      this.isManualCheck = false;
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
      this.isManualCheck = false;
    });

    // 6. Error handling - Silent on background check, sanitized on manual check
    autoUpdater.on('error', (err) => {
      const sanitized = this.sanitizeErrorMessage(err);
      Logger.warn('AUTO_UPDATER', `Update check notice: ${sanitized} (Raw: ${err?.message || err})`);

      if (this.isManualCheck) {
        this.broadcastState({
          status: 'error',
          error: sanitized,
        });
      } else {
        // Keep background check completely silent to never disrupt the user on startup
        this.currentState = { status: 'idle' };
      }
      this.isManualCheck = false;
    });

    // Schedule initial silent background check 5 seconds after launch in production
    if (app.isPackaged) {
      setTimeout(() => {
        this.isManualCheck = false;
        this.checkForUpdates(false).catch((err) => {
          Logger.info('AUTO_UPDATER', `Silent startup update check completed: ${err?.message || 'No updates'}`);
        });
      }, 5000);
    } else {
      Logger.info('AUTO_UPDATER', 'Running in development mode; background auto-updater checks paused.');
    }
  }

  /**
   * Triggers an update check.
   * @param manual If true, indicates explicit user request from menu/UI (will surface not-found / clean error notices)
   */
  public static async checkForUpdates(manual = true): Promise<{ success: boolean; message?: string }> {
    this.isManualCheck = manual;
    Logger.info('AUTO_UPDATER', `Update check initiated (manual=${manual})...`);

    if (!app.isPackaged) {
      Logger.info('AUTO_UPDATER', 'Development mode: Simulating up-to-date state');
      if (manual) {
        this.broadcastState({ status: 'checking' });
        setTimeout(() => {
          this.broadcastState({
            status: 'not-available',
            info: { version: app.getVersion() },
          });
        }, 600);
      }
      return {
        success: true,
        message: `Development environment: Current version v${app.getVersion()} is up to date.`,
      };
    }

    try {
      if (manual) {
        this.broadcastState({ status: 'checking' });
      }
      const result = await autoUpdater.checkForUpdates();
      Logger.info('AUTO_UPDATER', `Update check query finished: ${result ? result.updateInfo.version : 'Done'}`);
      return { success: true };
    } catch (err: any) {
      const sanitized = this.sanitizeErrorMessage(err);
      Logger.warn('AUTO_UPDATER', `Check for updates notice: ${sanitized}`);
      if (manual) {
        this.broadcastState({ status: 'error', error: sanitized });
      }
      return { success: false, message: sanitized };
    }
  }

  /**
   * Quits the application and installs the downloaded update silently.
   */
  public static quitAndInstall(): void {
    Logger.info('AUTO_UPDATER', 'Executing quitAndInstall (silent=true, isRunAfter=true)...');
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (err: any) {
      Logger.error('AUTO_UPDATER', `quitAndInstall failed: ${err?.message}`);
    }
  }

  /**
   * Converts raw HTTP/network errors into concise, user-friendly messages
   */
  private static sanitizeErrorMessage(rawError: any): string {
    if (!rawError) return 'Unable to check for updates at this time.';
    const msg = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);

    if (msg.includes('404') || msg.includes('releases.atom')) {
      return 'No published updates found on the repository yet.';
    }
    if (msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('net::ERR') || msg.includes('ECONNREFUSED')) {
      return 'Could not connect to update server. Please check your internet connection.';
    }
    if (msg.includes('401') || msg.includes('403') || msg.includes('authentication')) {
      return 'Authentication required to access update repository.';
    }

    // Strip multiline headers, cookies, or JSON dumps
    const firstLine = msg.split('\n')[0].replace(/Headers:.*/i, '').trim();
    if (!firstLine || firstLine.length > 100) {
      return 'No newer updates found at this time.';
    }
    return firstLine;
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
