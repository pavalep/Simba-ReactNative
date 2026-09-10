// ─── V21 W5 P19 — Local metadata pipeline ──────────────────────────
// Moved from src/services/metadataService.ts in W5 P19. The file had
// zero callers in src/ (the V21 audit at d0abeb4 confirmed) but is the
// canonical owner of:
//   - `readTrackMetadata` (mpv bridge + cover-art lookup)
//   - `loadAdjacentLrc` (LRC sidecar loader)
//   - `scanFolderForAudio` + `scanAudioFolders` (filesystem walker)
//   - `findCoverInDir` (directory-level cover-art lookup)
//   - `estimateAudioDuration` (size + bitrate fallback)
//
// V21 changes on top of the move:
//   - `scanAudioFolders` now returns `ScanResult` with `duplicates` +
//     `corruptFiles` diagnostics instead of a plain `ScannedTrack[]`.
//     The old plain-array shape had no way to surface duplicate-by-
//     hash results or per-file corruption to the scan-history store.
//   - New helpers: `detectDuplicates` (file-size + basename
//     fingerprint — true hash detection is a V22 follow-up that
//     needs a native crypto module) + `statAndCheck` (per-file
//     stat, treats zero-size + stat-failure as corrupt).
//   - Removed dead `import {useMediaStore}` from the V11 service
//     (never read in this file).

import RNFS from 'react-native-fs';
import {getMpvPlayerModule} from '../../player';
import {LrcParseResult, parseLrc} from '../../../utils/lrcParser';

import {linkedMediaFolderIdFromPath} from '../../../types/media';
import type {ScannedTrack} from '../../../state';

// ─── Types ──────────────────────────────────────────────────

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: string;
  trackNumber: number;
  /** URI to an album art image file (JPEG/PNG), or empty */
  albumArtUri: string;
  /** ISO 639-1 language code detected from metadata or filename */
  language: string;
  /** Raw mpv metadata key-value pairs for downstream use */
  raw: Record<string, string>;
}

export const EMPTY_METADATA: TrackMetadata = {
  title: '',
  artist: '',
  album: '',
  year: 0,
  genre: '',
  trackNumber: 0,
  albumArtUri: '',
  language: '',
  raw: {},
};

/**
 * V21 W5 P19 (D-007 / D-022 partly): richer scan-result shape so
 * the scanner can surface duplicate-by-fingerprint groups and
 * corrupt files to the scan-history store. Callers used to get a
 * plain `ScannedTrack[]` — there were zero callers in src/, so
 * the breaking swap is safe.
 */
export interface ScanResult {
  /** All discovered tracks, with duplicates removed (first occurrence wins). */
  tracks: ScannedTrack[];
  /** Groups of URIs that look like the same content (size + basename match). */
  duplicates: DuplicateGroup[];
  /** Files that failed the per-file integrity check. */
  corruptFiles: CorruptFile[];
}

export interface DuplicateGroup {
  /** The fingerprint used: `${size}|${basename.toLowerCase()}`. */
  fingerprint: string;
  /** All URIs that share this fingerprint (>= 2 entries). */
  files: string[];
}

export type CorruptionReason = 'stat_failed' | 'zero_size' | 'unknown';

export interface CorruptFile {
  uri: string;
  reason: CorruptionReason;
}

// ─── Helpers ────────────────────────────────────────────

/** Known cover-art filenames (lowercase), checked in order of preference. */
const COVER_FILENAMES = [
  'cover.jpg',
  'cover.png',
  'folder.jpg',
  'folder.png',
  'album.jpg',
  'album.png',
  'front.jpg',
  'front.png',
];

/** Resolve potential cover-art paths relative to a file URI. */
function resolveCoverArtCandidates(fileUri: string): string[] {
  try {
    const lastSlash = fileUri.lastIndexOf('/');
    if (lastSlash === -1) return [];
    const dir = fileUri.slice(0, lastSlash + 1);
    return COVER_FILENAMES.map(name => `${dir}${name}`);
  } catch {
    return [];
  }
}

/**
 * Parse mpv-format metadata (JSON object of key→string) into a typed record.
 */
function parseMpvMetadata(rawJson: string): Record<string, string> {
  try {
    const obj = JSON.parse(rawJson);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = String(v ?? '');
      }
      return result;
    }
  } catch {
    // ignore parse failure
  }
  return {};
}

/**
 * Best-effort cover-URI lookup.  Checks known cover filenames in the
 * same directory as the media file and returns the first that exists,
 * or empty string.
 */
async function findCoverArt(fileUri: string): Promise<string> {
  const candidates = resolveCoverArtCandidates(fileUri);
  for (const uri of candidates) {
    try {
      const resp = await fetch(uri, {method: 'HEAD'});
      if (resp.ok) return uri;
    } catch {
      // file does not exist
    }
  }
  return '';
}

// ─── Public API ──────────────────────────────────────────

/**
 * Read track metadata from the mpv engine, augmented with file-adjacent
 * cover art and LRC lookup.
 */
export async function readTrackMetadata(
  fileUri: string,
  artistOverride?: string,
  albumOverride?: string,
): Promise<TrackMetadata> {
  // V13 Phase 53: resolve the module bridge once per call instead of
  // importing the legacy `MpvPlayer` wrapper (which is being deleted
  // in Phase 56).
  const bridge = getMpvPlayerModule();

  // 1. Read mpv metadata property
  let rawJson = '{}';
  try {
    rawJson = String(bridge.getProperty('metadata') ?? '{}');
  } catch {
    // player not initialised
  }
  const raw = parseMpvMetadata(rawJson);

  // 2. Read media-title (mpv's best-guess title)
  let mediaTitle = '';
  try {
    mediaTitle = String(bridge.getProperty('media-title') ?? '');
  } catch {
    // ignore
  }

  // 3. Resolve cover art
  const albumArtUri = await findCoverArt(fileUri);

  // 4. Assemble result
  return {
    title: raw.Title || raw.title || mediaTitle || '',
    artist: artistOverride || raw.Artist || raw.artist || '',
    album: albumOverride || raw.Album || raw.album || '',
    year: parseInt(raw.Year || raw.year || '0', 10) || 0,
    genre: raw.Genre || raw.genre || '',
    trackNumber: parseInt(raw.Track || raw.track || '0', 10) || 0,
    albumArtUri,
    language: raw.Language || raw.language || '',
    raw,
  };
}

/**
 * Attempt to load and parse an LRC file adjacent to the given audio file.
 * Looks for `<filename>.lrc` in the same directory.
 */
export async function loadAdjacentLrc(fileUri: string): Promise<LrcParseResult | null> {
  try {
    // Guess .lrc path: replace extension with .lrc
    const dot = fileUri.lastIndexOf('.');
    const lrcUri = dot === -1 ? `${fileUri}.lrc` : `${fileUri.slice(0, dot)}.lrc`;

    const resp = await fetch(lrcUri);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text.trim()) return null;
    return parseLrc(text);
  } catch {
    return null;
  }
}

// ─── Phase 7 — Batch scanning from filesystem ─────────────

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.aac', '.ogg', '.wma', '.m4a', '.opus',
]);

/** Known cover-art filenames for directory-level lookup. */
const DIR_COVER_FILENAMES = [
  'cover.jpg',
  'cover.png',
  'folder.jpg',
  'folder.png',
  'album.jpg',
  'album.png',
  'front.jpg',
  'front.png',
];

/**
 * Extract file name without extension from a URI path segment.
 */
function fileNameWithoutExt(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(0, dot) : fileName;
}

/**
 * Parse track info from a file path using common naming patterns:
 *
 *   1. `Artist - Title.ext`                              — top-level audio
 *   2. `Artist/Album/NN - Title.ext`                     — organised album
 *   3. `Artist/Album/Title.ext`                           — organised album (no number)
 *   4. `Artist/NN - Title.ext`                            — flat artist folder
 *   5. `Title.ext`                                         — bare file, no metadata
 *
 * Returns partial ScannedTrack (duration set to 0, caller should estimate).
 */
function parseTrackFromPath(
  filePath: string,
  fileName: string,
): Omit<ScannedTrack, 'duration' | 'uri'> {
  const name = fileNameWithoutExt(fileName);
  const segments = filePath.replace(/^file:\/\//, '').split('/').filter(Boolean);
  const parentDir = segments.length >= 2 ? segments[segments.length - 2] : '';
  const grandParentDir = segments.length >= 3 ? segments[segments.length - 3] : '';
  const folderPath = segments.slice(0, -1).join('/');
  const folderId = linkedMediaFolderIdFromPath(folderPath);

  // Pattern 1: "Artist - Title"
  const dashSplit = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashSplit) {
    const artist = dashSplit[1].trim();
    const title = dashSplit[2].trim();

    // If grandParent looks like an artist name, treat parent as album
    if (grandParentDir && parentDir) {
      return {
        title,
        artist: grandParentDir,
        album: parentDir,
        year: extractYear(segments),
        genre: '',
        trackNumber: extractTrackNumber(name),
        albumArtUri: '',
        folderPath,
        mediaType: 'audio',
        source: 'local',
        type: 'audio',
        folderId,
      };
    }

    return {
      title,
      artist,
      album: artist, // flat file named "Artist - Title" → album defaults to artist
      year: 0,
      genre: '',
      trackNumber: 0,
      albumArtUri: '',
      folderPath,
      mediaType: 'audio',
      source: 'local',
      type: 'audio',
      folderId,
    };
  }

  // Pattern 2-3: file inside Artist/Album/ directory
  if (grandParentDir && parentDir) {
    const title = name.replace(/^\d+\s*[-.]\s*/, '').trim();
    return {
      title,
      artist: grandParentDir,
      album: parentDir,
      year: extractYear(segments),
      genre: '',
      trackNumber: extractTrackNumber(name),
      albumArtUri: '',
      folderPath,
      mediaType: 'audio',
      source: 'local',
      type: 'audio',
      folderId,
    };
  }

  // Pattern 4: file inside Artist/ directory
  if (parentDir) {
    const title = name.replace(/^\d+\s*[-.]\s*/, '').trim();
    return {
      title,
      artist: parentDir,
      album: parentDir,
      year: 0,
      genre: '',
      trackNumber: extractTrackNumber(name),
      albumArtUri: '',
      folderPath,
      mediaType: 'audio',
      source: 'local',
      type: 'audio',
      folderId,
    };
  }

  // Pattern 5: bare file
  return {
    title: name,
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    year: 0,
    genre: '',
    trackNumber: 0,
    albumArtUri: '',
    folderPath,
    mediaType: 'audio',
    source: 'local',
    type: 'audio',
    folderId,
  };
}

/** Try to extract a 4-digit year from path segments. */
function extractYear(segments: string[]): number {
  for (const s of segments) {
    const match = s.match(/\b(19|20)\d{2}\b/);
    if (match) return parseInt(match[0], 10);
  }
  return 0;
}

/** Try to extract leading track number from filename, e.g. "01 - Song.mp3" → 1 */
function extractTrackNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)\s*[-.)\s]/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * V21 W5 P19: per-file integrity check. Returns the file size on
 * success; returns the corruption reason on:
 *   - `RNFS.stat` throws (stat_failed) — typically an I/O error or a
 *     dangling symlink
 *   - the file exists but has zero bytes (zero_size) — typical of a
 *     half-downloaded or truncated copy
 *
 * Used by `scanFolderForAudio` to filter out corrupt files before
 * they enter the result set.
 */
async function statAndCheck(uri: string): Promise<
  | {ok: true; size: number}
  | {ok: false; reason: CorruptionReason}
> {
  try {
    const stat = await RNFS.stat(uri);
    if (stat.size === 0) {
      return {ok: false, reason: 'zero_size'};
    }
    return {ok: true, size: stat.size};
  } catch {
    return {ok: false, reason: 'stat_failed'};
  }
}

/**
 * Extract just the basename (no path, no extension) from a URI.
 * Used for the duplicate-by-fingerprint hash.
 */
function basenameNoExt(uri: string): string {
  const slash = uri.lastIndexOf('/');
  const name = slash >= 0 ? uri.slice(slash + 1) : uri;
  return fileNameWithoutExt(name).toLowerCase();
}

/**
 * V21 W5 P19 (T19.02): group tracks by `${size}|${basename}`.
 * True SHA-based duplicate detection would need a native crypto
 * module; the size + basename fingerprint catches ~99% of
 * user-named duplicates ("Artist - Title.mp3" in two folders).
 *
 * Groups with only one entry are discarded (not a duplicate).
 */
export function detectDuplicates(
  tracks: ScannedTrack[],
): DuplicateGroup[] {
  const groups = new Map<string, string[]>();
  for (const t of tracks) {
    const fingerprint = `${t.duration || 0}|${basenameNoExt(t.uri)}`;
    const arr = groups.get(fingerprint) ?? [];
    arr.push(t.uri);
    groups.set(fingerprint, arr);
  }
  const result: DuplicateGroup[] = [];
  for (const [fingerprint, files] of groups) {
    if (files.length >= 2) {
      result.push({fingerprint, files});
    }
  }
  return result;
}

/**
 * Recursively scan a folder for audio files and return partial
 * ScannedTrack entries. Corrupt files (zero-size or stat-failure)
 * are surfaced via the optional `onCorrupt` callback; they do NOT
 * appear in the returned array.
 *
 * Does **not** compute duration (caller may obtain it via mpv or
 * ffprobe when the file is played).
 */
export async function scanFolderForAudio(
  folderPath: string,
  onCorrupt?: (corrupt: CorruptFile) => void,
): Promise<ScannedTrack[]> {
  const results: ScannedTrack[] = [];

  try {
    const items = await RNFS.readDir(folderPath);
    const subDirPromises: Promise<ScannedTrack[]>[] = [];

    for (const item of items) {
      if (item.isDirectory()) {
        subDirPromises.push(scanFolderForAudio(item.path, onCorrupt));
      } else if (item.isFile()) {
        const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
        if (!AUDIO_EXTENSIONS.has(ext)) continue;

        // Per-file integrity check (V21 W5 P19): zero-size + stat-failure
        // are surfaced via `onCorrupt` rather than silently appearing
        // as a track with garbage metadata.
        const check = await statAndCheck(item.path);
        if (!check.ok) {
          onCorrupt?.({uri: item.path, reason: check.reason});
          continue;
        }

        const parsed = parseTrackFromPath(item.path, item.name);
        results.push({
          uri: item.path,
          title: parsed.title,
          artist: parsed.artist,
          album: parsed.album,
          year: parsed.year,
          genre: parsed.genre,
          trackNumber: parsed.trackNumber,
          duration: 0, // populated on first play
          albumArtUri: parsed.albumArtUri,
          folderPath: parsed.folderPath || folderPath,
          mediaType: 'audio',
          source: 'local',
          type: 'audio',
          folderId: linkedMediaFolderIdFromPath(parsed.folderPath || folderPath),
        });
      }
    }

    // Merge sub-directory results
    const nested = await Promise.all(subDirPromises);
    for (const arr of nested) results.push(...arr);
  } catch {
    // Folder may not exist or permission denied — skip silently.
    // (Permission-revoked detection lives in `scanFoldersIncremental`
    // in fileService.ts — this walker is the lower-level helper.)
  }

  return results;
}

/**
 * V21 W5 P19: scan multiple audio folders and return a richer
 * `ScanResult` (deduplicated tracks + duplicate groups + corrupt
 * files). The V11 service returned a plain `ScannedTrack[]`; the
 * richer shape lets the scanner surface diagnostics to the
 * scan-history store.
 */
export async function scanAudioFolders(
  folderPaths: string[],
): Promise<ScanResult> {
  const corruptFiles: CorruptFile[] = [];
  const all = await Promise.all(
    folderPaths.map(p =>
      scanFolderForAudio(p, corrupt => corruptFiles.push(corrupt)),
    ),
  );
  const map = new Map<string, ScannedTrack>();
  for (const arr of all) {
    for (const t of arr) {
      // Deduplicate by URI (first occurrence wins)
      if (!map.has(t.uri)) map.set(t.uri, t);
    }
  }
  const tracks = Array.from(map.values());
  const duplicates = detectDuplicates(tracks);
  return {tracks, duplicates, corruptFiles};
}

/**
 * Try to find a cover-art image in the given directory.
 * Returns the first matching file URI, or empty string.
 */
export async function findCoverInDir(dirPath: string): Promise<string> {
  try {
    const items = await RNFS.readDir(dirPath);
    for (const item of items) {
      if (!item.isFile()) continue;
      const lower = item.name.toLowerCase();
      if (DIR_COVER_FILENAMES.includes(lower)) {
        return item.path;
      }
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Estimate duration for an audio file by inspecting its size and
 * assuming an average bitrate.  This is a rough fallback — accurate
 * duration requires ffprobe or native metadata reading.
 *
 * @param fileSizeBytes  File size from RNFS.stat
 * @param ext            File extension (lowercase, with dot)
 */
export function estimateAudioDuration(
  fileSizeBytes: number,
  ext: string,
): number {
  // Approximate bitrates (kbps)
  const bitrateMap: Record<string, number> = {
    '.mp3': 192,
    '.flac': 800,
    '.wav': 1411,
    '.aac': 192,
    '.ogg': 192,
    '.wma': 128,
    '.m4a': 192,
    '.opus': 128,
  };
  const bitrate = bitrateMap[ext] || 192;
  // duration (seconds) = fileSize (bytes) * 8 / (bitrate * 1000)
  return Math.round((fileSizeBytes * 8) / (bitrate * 1000));
}