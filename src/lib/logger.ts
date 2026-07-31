import RNFS from 'react-native-fs';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

/** 60.5: persisted crash log for beta crash collection (DocumentDirectory/crash.log) */
const CRASH_LOG_PATH = `${RNFS.DocumentDirectoryPath}/crash.log`;

/** Best-effort serialization of an error entry into a single log line. */
function serializeArgs(args: any[]): string {
  return args
    .map(a => {
      if (a instanceof Error) return a.stack || a.message || String(a);
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: any[]): void {
    if (__DEV__ && LOG_LEVELS.indexOf(this.level) <= 0) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (__DEV__ && LOG_LEVELS.indexOf(this.level) <= 1) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (__DEV__ && LOG_LEVELS.indexOf(this.level) <= 2) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    // 60.5: always emit — in release builds this is the crash-reporting
    // hook for ErrorBoundary (visible via adb logcat) plus a persisted
    // on-device crash.log for beta triage.
    console.error('[ERROR]', ...args);
    try {
      const line = `[${new Date().toISOString()}] ${serializeArgs(args)}\n`;
      RNFS.appendFile(CRASH_LOG_PATH, line, 'utf8').catch(() => {
        // best-effort persistence — never crash the app on log failure
      });
    } catch {
      // no-op
    }
  }
}

export const logger = new Logger();
