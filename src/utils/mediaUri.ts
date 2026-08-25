/**
 * URI classification helpers for the unified streaming media model (P33).
 * Remote URIs (http/https) bypass local-file validation and get streaming
 * affordances (buffering, retry-with-backoff, cached remote artwork).
 */

// NOTE: scheme here is extracted WITHOUT the colon (uri.split('://')[0]),
// so entries must NOT include ':'.
const REMOTE_SCHEMES = ['http', 'https'];

/**
 * Whether a URI points to a remote network resource rather than a local file.
 * Also treats content:// and blob: as "remote-like" (not directly readable
 * by the native file layer).
 */
export function isRemoteUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  try {
    const scheme = uri.split('://')[0]?.toLowerCase() ?? '';
    return REMOTE_SCHEMES.includes(scheme) || scheme === 'content' || scheme === 'blob';
  } catch {
    return false;
  }
}

/**
 * Best-effort human-readable source label for a URI (host for remote URIs,
 * otherwise undefined). Used to tag recents/bookmarks/playlist entries.
 */
export function sourceFromUri(uri: string | null | undefined): string | undefined {
  if (!uri || !isRemoteUri(uri)) return undefined;
  try {
    const match = /^[a-z]+:\/\/([^/]+)/i.exec(uri);
    return match?.[1] ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract a stable cache key (hash) from a URI for artwork caching.
 * Uses Math.imul (no bitwise operators) so it passes eslint's no-bitwise.
 */
export function cacheKeyFromUri(uri: string): string {
  let hash = 5381;
  for (let i = 0; i < uri.length; i += 1) {
    hash = Math.imul(hash, 33) + uri.charCodeAt(i);
  }
  return `${Math.abs(hash).toString(36)}-${uri.length.toString(36)}`;
}

/**
 * V6 3.1.1: Best-effort stream-type classification. Used to decide which
 * seek guardrails to apply (live, live-DVR, VOD-stream, file).
 *
 * We cannot know the true type from the URL alone — HLS playlists (.m3u8)
 * and DASH manifests (.mpd) can be either live or VOD. The `isLive` flag
 * is therefore derived at runtime from MPV once playback starts.
 * This helper only provides a *hint* so the UI can
 * render the right affordances before the first frame.
 */
export type StreamType = 'hls' | 'dash' | 'file' | 'other';

export function classifyStreamType(uri: string | null | undefined): StreamType {
  if (!uri) return 'other';
  const lower = uri.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mpd')) return 'dash';
  if (!isRemoteUri(uri)) return 'file';
  return 'other';
}
