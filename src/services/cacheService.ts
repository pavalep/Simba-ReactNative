import RNFS from 'react-native-fs';

/**
 * Storage management helpers (Phase 46.4).
 * Reports the app cache footprint and clears it. Cache lives under the
 * platform cache directory (thumbnails, temp extraction, mpv scratch).
 */

async function dirSize(path: string): Promise<number> {
  try {
    const items = await RNFS.readDir(path);
    let total = 0;
    for (const item of items) {
      if (item.isDirectory()) {
        total += await dirSize(item.path);
      } else {
        total += item.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/** Total cache size in bytes. */
export async function getCacheSize(): Promise<number> {
  return dirSize(RNFS.CachesDirectoryPath);
}

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
  } catch {}
}
