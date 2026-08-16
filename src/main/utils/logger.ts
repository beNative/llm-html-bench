import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { LogEntry, LogLevel, LogConfig } from '../../shared/types/ipc';

export class Logger {
  private static logDirectory: string = '';
  private static logFileName: string = '';
  private static logFilePath: string = '';
  private static autoSaveToFile: boolean = true;
  private static inMemoryLogs: LogEntry[] = [];
  private static maxInMemoryLogs: number = 2000;
  private static broadcastHandler: ((entry: LogEntry) => void) | null = null;

  /**
   * Set callback to stream live logs to the renderer process
   */
  public static setBroadcastHandler(handler: ((entry: LogEntry) => void) | null): void {
    this.broadcastHandler = handler;
  }

  /**
   * Initialize logging directory and compute sensible log file path
   */
  public static initialize(): string {
    try {
      if (app && typeof app.getPath === 'function') {
        this.logDirectory = path.join(app.getPath('userData'), 'logs');
      } else {
        this.logDirectory = path.join(process.cwd(), 'logs');
      }
    } catch {
      this.logDirectory = path.join(process.cwd(), 'logs');
    }

    if (!fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      } catch (err) {
        console.error('Failed to create log directory:', err);
      }
    }

    // Sensible naming convention: llm-html-bench-YYYY-MM-DD.log
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    this.logFileName = `llm-html-bench-${dateStr}.log`;
    this.logFilePath = path.join(this.logDirectory, this.logFileName);

    this.info('MAIN', `Logger initialized. Storing logs at: ${this.logFilePath}`);
    return this.logFilePath;
  }

  public static getLogConfig(): LogConfig {
    if (!this.logFilePath) {
      this.initialize();
    }
    return {
      autoSaveToFile: this.autoSaveToFile,
      logFilePath: this.logFilePath,
      logFileName: this.logFileName,
      logDirectory: this.logDirectory,
    };
  }

  public static setAutoSaveToFile(enabled: boolean): { success: boolean; logFilePath: string } {
    this.autoSaveToFile = enabled;
    if (enabled && !this.logFilePath) {
      this.initialize();
    }
    this.info('MAIN', `Auto-save to logfile has been ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return { success: true, logFilePath: this.logFilePath };
  }

  public static getEntries(): LogEntry[] {
    return [...this.inMemoryLogs];
  }

  public static clear(): void {
    this.inMemoryLogs = [];
  }

  /**
   * Internal logging engine
   */
  private static logInternal(level: LogLevel, source: string, message: string, details?: string): void {
    const now = new Date();
    const timestamp = now.toISOString();
    const timeFormatted = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const entry: LogEntry = {
      id,
      timestamp,
      timeFormatted,
      level,
      source: source.toUpperCase(),
      message,
      details,
    };

    // 1. Maintain in-memory ring buffer
    this.inMemoryLogs.push(entry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.shift();
    }

    // 2. Terminal console output with ANSI coloring
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[32m',    // Green
      INFO: '\x1b[34m',     // Blue
      WARNING: '\x1b[33m',  // Orange / Yellow
      ERROR: '\x1b[31m',    // Red
    };
    const resetColor = '\x1b[0m';
    const consoleMsg = `[${timeFormatted}] [${colors[level]}${level}${resetColor}] [${source.toUpperCase()}] ${message}`;

    if (level === 'ERROR') {
      console.error(consoleMsg, details || '');
    } else if (level === 'WARNING') {
      console.warn(consoleMsg, details || '');
    } else {
      console.log(consoleMsg, details || '');
    }

    // 3. Write to file if auto-save is enabled
    if (this.autoSaveToFile) {
      try {
        if (!this.logFilePath) {
          this.initialize();
        }
        const fileLine = `[${timestamp}] [${level}] [${source.toUpperCase()}] ${message}${details ? ' | Details: ' + details : ''}\n`;
        fs.appendFileSync(this.logFilePath, fileLine, 'utf-8');
      } catch (err) {
        console.error('Failed to append to logfile:', err);
      }
    }

    // 4. Broadcast to renderer live stream
    if (this.broadcastHandler) {
      try {
        this.broadcastHandler(entry);
      } catch (err) {
        console.error('Failed to broadcast log entry to renderer:', err);
      }
    }
  }

  public static debug(sourceOrMsg: string, message?: any, details?: any): void {
    if (message !== undefined) {
      this.logInternal('DEBUG', sourceOrMsg, String(message), details ? String(details) : undefined);
    } else {
      this.logInternal('DEBUG', 'APP', String(sourceOrMsg));
    }
  }

  public static info(sourceOrMsg: string, message?: any, details?: any): void {
    if (message !== undefined) {
      this.logInternal('INFO', sourceOrMsg, String(message), details ? String(details) : undefined);
    } else {
      this.logInternal('INFO', 'APP', String(sourceOrMsg));
    }
  }

  public static warn(sourceOrMsg: string, message?: any, details?: any): void {
    if (message !== undefined) {
      this.logInternal('WARNING', sourceOrMsg, String(message), details ? String(details) : undefined);
    } else {
      this.logInternal('WARNING', 'APP', String(sourceOrMsg));
    }
  }

  public static warning(sourceOrMsg: string, message?: any, details?: any): void {
    this.warn(sourceOrMsg, message, details);
  }

  public static error(sourceOrMsg: any, message?: any, details?: any): void {
    let det = details ? String(details) : undefined;
    let msg = String(message !== undefined ? message : sourceOrMsg);
    let src = message !== undefined ? String(sourceOrMsg) : 'APP';

    if (message instanceof Error) {
      msg = message.message;
      det = message.stack;
    } else if (sourceOrMsg instanceof Error) {
      msg = sourceOrMsg.message;
      det = sourceOrMsg.stack;
      src = 'APP';
    }

    this.logInternal('ERROR', src, msg, det);
  }
}
