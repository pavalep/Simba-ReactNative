const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: any[]): void {
    if (LOG_LEVELS.indexOf(this.level) <= 0) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (LOG_LEVELS.indexOf(this.level) <= 1) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (LOG_LEVELS.indexOf(this.level) <= 2) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }
}

export const logger = new Logger();
