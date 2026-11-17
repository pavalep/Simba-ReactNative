import RNFS from 'react-native-fs';
import {logger} from '../lib/logger';

/**
 * Storage management helpers (Phase 46.4).
 * Reports the app cache footprint and clears it. Cache lives under the
 * platform cache directory (thumbnails, temp extraction, mpv scratch).
 */

/** Human-readable size label, e.g. "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[idx]}`;
}

/** Delete everything under the cache directory. */
export async function clearCache(): Promise<void> {
  try {
    const items = await RNFS.readDir(RNFS.CachesDirectoryPath);
    await Promise.all(
      items.map(item =>
        item.isDirectory()
          ? RNFS.unlink(item.path)
          : RNFS.unlink(item.path),
      ),
    );
  } catch (e) {
    // V16 Phase 73: log so a silent cache-clear failure is
    // visible. The original behavior (swallow + return 0) is
    // preserved at the function boundary; this just makes
    // the failure observable for diagnostics.
    logger.warn('[cacheService] failed to clear cache entries', e);
  }
}
