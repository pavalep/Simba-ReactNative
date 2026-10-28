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
 * Turn a stored image path into something an image loader can fetch.
 *
 * The history store holds BOTH kinds of image:
 *
 *  - catalogue artwork — a remote `https://` URL (archive.org's
 *    `services/img/{id}`, a CDN cover), and
 *  - the resume frame — a LOCAL file path, written by the native capture
 *    into the app's `filesDir`.
 *
 * A local path is not a URI. An image loader parses `/data/user/0/…` as a
 * scheme-less URI and fails, so a card that had a perfectly good captured
 * frame fell back to its grey placeholder. A local path needs the
 * `file://` scheme; a remote URL must be left exactly as it is — prefixing
 * `file://` to an `https://` URL produces a path that names no file.
 */
export function toRenderableImageUri(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;
  // Already carries a scheme (`file:`, `http:`, `https:`, `content:`…).
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `file://${path}`;
}

/**
 * Append a cache-busting token to an image URI.
 *
 * The search tile busts its thumbnail cache on `lastPlayedAt`, so the same
 * poster is fetched again when an item is played a second time. The token
 * goes on the END of the URI, and it goes on with the right separator: a
 * URL that already carries a query needs `&`, not a second `?`.
 *
 * Whether a scheme is needed is NOT this function's decision —
 * `toRenderableImageUri` makes it, because `file://https://…` names no
 * file at all.
 */
export function withCacheToken(uri: string, token: string): string {
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}t=${encodeURIComponent(token)}`;
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

// ─── Local media: which lane, and what it is called ────────────────────
//
// ONE owner for both facts.
//
// They used to live in two places that could not see each other: the
// app's `services/fileService` answered "which lane is this file in" for
// the picker and the folder browser, and the lib's `useOpenFromUrl`
// answered it AGAIN for the deep link, in module-private code nobody
// could reuse. Two tables, two chances to drift.
//
// They cannot live in `services/fileService` either: that module imports
// the player barrel, so the player layer importing it back would be a
// cycle — and a cycle in this repo has shipped as a redbox. This module
// is a leaf, so both sides can read it.

/**
 * The lane a LOCAL media file belongs to.
 *
 * Named `MediaLane` rather than `MediaType` so it cannot be confused with
 * the catalogue's `mediaType` ("movie" / "episode" / "track") or with the
 * bridge's `type` (`'video' | 'audio'`). Same two answers, different
 * question.
 */
export type MediaLane = 'audio' | 'video';

/** Audio-only file extensions (lowercase, no dot). */
const AUDIO_EXTENSIONS = new Set([
  'mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a', 'opus',
]);

/** Video file extensions (lowercase, no dot). */
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg',
]);

/**
 * The lowercased extension of a name or path, or null when it has none.
 *
 * `null` and `''` are different answers: `''` means "the name ends in a
 * dot", `null` means "there is no extension at all" — which is what a
 * `content://` URI has, and the distinction is what a picked file's
 * classification turns on.
 *
 * A malformed percent-escape is NOT a reason to throw while classifying a
 * file: `decodeURIComponent('100%.mp4')` raises, and a classifier that
 * crashes on a weird filename is worse than one that guesses. The raw
 * name still carries the extension.
 */
export function extensionOf(nameOrPath: string): string | null {
  const raw = nameOrPath.split(/[/\\]/).pop() || '';
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // Keep the raw name — its extension is still readable.
  }
  const dot = name.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  return ext.length > 0 ? ext : null;
}

/**
 * The lane an extension belongs to, or `null` when the extension is not a
 * media extension at all.
 *
 * `null` is a real answer and not a fallback: it is what lets a caller
 * try a SECOND signal (the MIME type the picker reports, the display
 * name) before it falls back to the default lane.
 */
export function mediaTypeFromExtension(
  extension: string | null,
): MediaLane | null {
  if (extension == null) return null;
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return null;
}

/**
 * The lane a local media URI belongs to.
 *
 * The fallback is `'video'` — the lane that can show a picture. An
 * unknown file opens in the video lane rather than silently losing its
 * picture.
 */
export function mediaTypeFromUri(uri: string): MediaLane {
  return mediaTypeFromExtension(extensionOf(uri)) ?? 'video';
}

/**
 * A human-readable name for a media URI: the basename, without the
 * extension, URL-decoded.
 *
 * A `content://` share-sheet URI has no filename — its last segment is a
 * provider id — so the name is that id. Reading the real name needs the
 * `ContentResolver`, which is a native call.
 */
export function displayNameFromUri(uri: string, fallback = 'Shared File'): string {
  const clean = uri.split('?')[0].split('#')[0];
  const fileName = clean.split('/').pop() || fallback;
  const noExt = fileName.replace(/\.[^.]+$/, '');
  try {
    return decodeURIComponent(noExt) || fallback;
  } catch {
    // Malformed escape — fall back to the raw basename.
    return noExt || fallback;
  }
}
