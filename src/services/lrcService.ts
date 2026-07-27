import {parseLrc, type LrcLine, type LrcParseResult} from '../utils/lrcParser';

// ─── In-memory cache ─────────────────────────────────────

const lrcCache = new Map<string, LrcParseResult>();

// ─── Public API ──────────────────────────────────────────

/**
 * Attempt to load and parse an LRC file alongside the given audio URI.
 *
 * Lookup order:
 *  1. `<audioFile>.lrc`     (e.g. `song.mp3.lrc` → `song.lrc`)
 *  2. `<audioFile>.LRC`     (uppercase extension variant)
 *  3. Same directory, filename with `.lrc` extension retained
 *
 * On success the result is cached; subsequent calls return instantly.
 */
export async function loadLrc(fileUri: string): Promise<LrcParseResult | null> {
  // Check cache first
  if (lrcCache.has(fileUri)) {
    return lrcCache.get(fileUri)!;
  }

  const candidates = guessLrcPaths(fileUri);

  for (const uri of candidates) {
    try {
      const resp = await fetch(uri);
      if (!resp.ok) continue;
      const text = await resp.text();
      if (!text.trim()) continue;
      const result = parseLrc(text);
      lrcCache.set(fileUri, result);
      return result;
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Invalidate cached LRC data for a file (e.g. when the file changes).
 */
export function clearLrcCache(fileUri?: string): void {
  if (fileUri) {
    lrcCache.delete(fileUri);
  } else {
    lrcCache.clear();
  }
}

/**
 * Get the active lyric line index for a given playback position.
 * Returns -1 when no lyrics are loaded or position is before the first line.
 */
export function getActiveLyricIndex(
  lines: LrcLine[],
  positionSeconds: number,
): number {
  if (lines.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= positionSeconds) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

/**
 * Get upcoming lyric lines starting from the given position.
 */
export function getUpcomingLyrics(
  lines: LrcLine[],
  positionSeconds: number,
  count = 5,
): LrcLine[] {
  const cur = getActiveLyricIndex(lines, positionSeconds);
  const start = Math.max(0, cur + 1);
  return lines.slice(start, start + count);
}

// ─── Internals ───────────────────────────────────────────

function guessLrcPaths(fileUri: string): string[] {
  const results: string[] = [];
  const lastSlash = fileUri.lastIndexOf('/');
  if (lastSlash === -1) return results;

  const dir = fileUri.slice(0, lastSlash + 1);
  const filename = fileUri.slice(lastSlash + 1);

  // Strip one extension
  const dot = filename.lastIndexOf('.');
  const baseName = dot === -1 ? filename : filename.slice(0, dot);

  results.push(`${dir}${baseName}.lrc`);   // song.lrc
  results.push(`${dir}${baseName}.LRC`);   // song.LRC
  results.push(`${dir}${filename}.lrc`);   // song.mp3.lrc (unusual but possible)

  return results;
}
