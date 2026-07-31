import RNFS from 'react-native-fs';

import {isRemoteUri, cacheKeyFromUri} from '../utils/mediaUri';

/**
 * Remote artwork disk LRU cache (P33.7).
 * Downloads http(s) artwork once into cachesDirectory/artCache, keyed by a
 * stable hash of the source URL, and evicts the oldest files past a cap so
 * recents/bookmarks keep working offline without repeat network fetches.
 */

const ART_CACHE_DIR = `${RNFS.CachesDirectoryPath}/artCache`;
/** Hard cap — oldest files are evicted beyond this count (33.7) */
const MAX_FILES = 200;
/** In-memory uri→localPath mirror (59.4): makes already-cached art resolve
 *  synchronously on remount, killing placeholder flash / scroll flicker. */
const MEMORY_MAX = 300;
const memoryCache = new Map<string, string>();

function remember(uri: string, localUri: string): void {
  memoryCache.set(uri, localUri);
  if (memoryCache.size > MEMORY_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
}

/**
 * Sync memory-only lookup — instant for already-cached art, no disk IO.
 */
export function getCachedArtPathSync(uri: string | null | undefined): string | null {
  if (!uri || !isRemoteUri(uri)) return null;
  return memoryCache.get(uri) ?? null;
}

function artFilePath(uri: string): string {
  const extMatch = /\.(jpe?g|png|webp|gif|bmp)(?:[?#]|$)/i.exec(uri);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  return `${ART_CACHE_DIR}/${cacheKeyFromUri(uri)}.${ext}`;
}

/**
 * Local `file://` path for a remote artwork URL if already cached, else null.
 */
export async function getCachedArtPath(uri: string): Promise<string | null> {
  if (!isRemoteUri(uri)) return null;
  const memHit = getCachedArtPathSync(uri);
  if (memHit) return memHit;
  try {
    const filePath = artFilePath(uri);
    const exists = await RNFS.exists(filePath);
    if (exists) {
      const localUri = `file://${filePath}`;
      remember(uri, localUri);
      return localUri;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Download a remote artwork URL into the disk cache and return its local
 * `file://` path (no-op if already cached). Returns null on failure.
 */
export async function cacheArt(uri: string): Promise<string | null> {
  if (!isRemoteUri(uri)) return null;
  try {
    const filePath = artFilePath(uri);
    const localUri = `file://${filePath}`;
    if (await RNFS.exists(filePath)) return localUri;
    await RNFS.mkdir(ART_CACHE_DIR);
    const result = await RNFS.downloadFile({fromUrl: uri, toFile: filePath}).promise;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      remember(uri, localUri);
      pruneArtCache().catch(() => {});
      return localUri;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Evict the oldest files (by mtime) past the cap. Best-effort, fire-and-forget.
 */
export async function pruneArtCache(maxFiles: number = MAX_FILES): Promise<void> {
  try {
    const files = await RNFS.readDir(ART_CACHE_DIR);
    if (files.length <= maxFiles) return;
    const evictCount = files.length - maxFiles;
    const oldest = files
      .sort((a, b) => (a.mtime?.getTime() ?? 0) - (b.mtime?.getTime() ?? 0))
      .slice(0, evictCount);
    for (const f of oldest) {
      try {
        await RNFS.unlink(f.path);
      } catch {}
    }
  } catch {}
}
