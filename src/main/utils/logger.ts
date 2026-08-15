import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class Logger {
  private static logFilePath: string = '';

  public static initialize(): string {
    let userDataPath: string;
    try {
      userDataPath = app.getPath('userData');
    } catch {
      userDataPath = path.join(process.cwd(), '.data');
    }
    const logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFilePath = path.join(logDir, 'app.log');
    this.info('Logger initialized. Log file:', this.logFilePath);
    return this.logFilePath;
  }

  public static getLogFilePath(): string {
    if (!this.logFilePath) {
      this.initialize();
    }
    return this.logFilePath;
  }

  private static write(level: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    });
    const message = `[${timestamp}] [${level}] ${formattedArgs.join(' ')}\n`;

    // Console output
    if (level === 'ERROR') {
      console.error(message.trimEnd());
    } else if (level === 'WARN') {
      console.warn(message.trimEnd());
    } else {
      console.log(message.trimEnd());
    }

    // Append to file
    try {
      if (!this.logFilePath) {
        this.initialize();
      }
      if (this.logFilePath) {
        fs.appendFileSync(this.logFilePath, message, 'utf-8');
      }
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  public static info(...args: any[]): void {
    this.write('INFO', ...args);
  }

  public static warn(...args: any[]): void {
    this.write('WARN', ...args);
  }

  public static error(...args: any[]): void {
    this.write('ERROR', ...args);
  }

  public static debug(...args: any[]): void {
    this.write('DEBUG', ...args);
  }
}
