import {pick, types} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';

import {isRemoteUri} from '../utils/mediaUri';

import type {ScannedTrack} from '../store/slices/mediaSlice';
import {linkedMediaFolderId} from '../types/media';

/** Subtitle file types for document picker */
const SUBTITLE_TYPES = [
  'text/*',
  'application/x-subrip',
  'application/octet-stream',
];

export interface PickedFile {
  uri: string;
  title: string;
  type: string | null;
  size: number | null;
}

/** Known media extensions (lowercase, no dot) */
const MEDIA_EXTENSIONS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg',
  'mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a', 'opus',
  'srt', 'ass', 'vtt', // subtitles
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', // images
]);

function getExtension(uri: string): string {
  const name = decodeURIComponent(uri.split(/[/\\]/).pop() || '');
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Audio-only file extensions */
const AUDIO_EXTENSIONS = new Set([
  'mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a', 'opus',
]);

/** Video file extensions */
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg',
]);

export type MediaType = 'video' | 'audio';

/** Classify a media file URI as video or audio based on its extension. */
export function getMediaType(uri: string): MediaType {
  const ext = getExtension(uri);
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  return 'video';
}

export interface FileValidation {
  valid: boolean;
  /** User-facing error title */
  title: string;
  /** Detailed message explaining the issue */
  message: string;
  /** Tech hint (file path, size) */
  detail?: string;
}

/**
 * Validate a media file before playback.
 * Returns {valid: false, title, message} on any issue.
 */
export async function validateMediaFile(uri: string): Promise<FileValidation> {
  // 1. Basic URI check
  if (!uri || uri.trim().length === 0) {
    return {
      valid: false,
      title: 'No File Selected',
      message: 'The file URI is empty. Please select a valid media file.',
    };
  }

  // 1b. Remote URIs (http/https) — skip local file checks entirely; the
  //     player handles network loading. (P33 streaming model)
  if (isRemoteUri(uri)) {
    return {valid: true, title: '', message: ''};
  }

  // 2. For content:// URIs — skip RNFS.stat (it may not work with all
  //    content URIs) and rely on the Kotlin bridge to resolve via
  //    ContentResolver → fd://N. Do extension check only.
  if (uri.startsWith('content://')) {
    const ext = getExtension(uri);
    if (ext && !MEDIA_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        title: 'Unsupported Format',
        message: `".${ext}" files are not recognized as a supported media format. The player may not be able to play this file.`,
        detail: `Unknown extension: .${ext}`,
      };
    }
    return {valid: true, title: '', message: ''};
  }

  // 3. Permission check — try to stat the file
  let stat: RNFS.StatResult;
  try {
    stat = await RNFS.stat(uri);
  } catch (err: unknown) {
    // EACCES / EPERM / ENOENT — permission or not found
    const code = err && typeof err === 'object' && 'code' in err ? (err as {code?: string}).code : undefined;
    if (code === 'EACCES' || code === 'EPERM') {
      return {
        valid: false,
        title: 'Permission Denied',
        message:
          'The app does not have permission to access this file. Try selecting it again from the file picker.',
        detail: uri,
      };
    }
    return {
      valid: false,
      title: 'File Not Found',
      message: 'The file could not be found. It may have been moved, renamed, or deleted.',
      detail: uri,
    };
  }

  // 4. Is it actually a file?
  if (!stat.isFile()) {
    return {
      valid: false,
      title: 'Not a File',
      message: 'The selected path is not a regular file.',
      detail: uri,
    };
  }

  // 5. Empty file check
  if (stat.size === 0) {
    return {
      valid: false,
      title: 'Empty File',
      message: 'The selected file is empty (0 bytes) and cannot be played.',
      detail: `${getFileName(uri)} — 0 bytes`,
    };
  }

  // 6. Extension sanity check (warn but don't block)
  const ext = getExtension(uri);
  if (ext && !MEDIA_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      title: 'Unsupported Format',
      message: `".${ext}" files are not recognized as a supported media format. The player may not be able to play this file.`,
      detail: `Unknown extension: .${ext}`,
    };
  }

  // 7. Suspiciously small file (< 100 bytes) — likely corrupt or invalid
  if (stat.size < 100) {
    return {
      valid: false,
      title: 'File May Be Corrupt',
      message:
        'The file is too small to contain valid media data. It may be corrupt or incomplete.',
      detail: `${getFileName(uri)} — ${stat.size} bytes`,
    };
  }

  return {
    valid: true,
    title: '',
    message: '',
  };
}

/**
 * Open system file picker and let user pick media files.
 * Returns null if user cancels.
 */
export async function pickMediaFile(): Promise<PickedFile | null> {
  try {
    const [result] = await pick({
      type: [types.allFiles],
      allowMultiSelection: false,
      mode: 'open',
      requestLongTermAccess: true,
    });
    if (!result) return null;

    // Grant persistable permission so the content:// URI survives restarts
    if (result.uri.startsWith('content://')) {
      getMpvPlayerModule().grantPersistablePermission(result.uri);
    }

    return {
      uri: result.uri,
      title: result.name ?? 'Untitled',
      type: result.type ?? null,
      size: result.size ?? null,
    };
  } catch (err: unknown) {
    // User cancelled — not an error
    const code = err && typeof err === 'object' && 'code' in err ? (err as {code?: string}).code : undefined;
    if (code === 'OPERATION_CANCELED') return null;
    throw err;
  }
}

/**
 * Open system file picker for subtitle files (.srt, .ass, .vtt).
 */
export async function pickSubtitleFile(): Promise<PickedFile | null> {
  try {
    const [result] = await pick({
      type: SUBTITLE_TYPES,
      allowMultiSelection: false,
    });
    if (!result) return null;

    return {
      uri: result.uri,
      title: result.name ?? 'Untitled',
      type: result.type ?? null,
      size: result.size ?? null,
    };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as {code?: string}).code : undefined;
    if (code === 'OPERATION_CANCELED') return null;
    throw err;
  }
}

/** Known subtitle extensions for validation */
const SUBTITLE_EXTENSIONS = new Set(['srt', 'ass', 'ssa', 'vtt', 'sub', 'txt']);

/**
 * Validate that a picked file looks like a subtitle file.
 */
export function isValidSubtitleFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return SUBTITLE_EXTENSIONS.has(ext);
}

/**
 * Check if a file exists at the given URI.
 * Returns false for invalid/missing content URIs gracefully.
 *
 * For content:// URIs, we first try RNFS.stat (which may fail if RNFS
 * doesn't support content URIs on this device). In that case we fall
 * back to the native verifyContentUri method which opens the URI via
 * ContentResolver — this works for persistable URIs that survived an
 * app restart.
 */
export async function checkFileExists(uri: string): Promise<boolean> {
  try {
    if (uri.startsWith('content://')) {
      try {
        const stat = await RNFS.stat(uri);
        if (stat.isFile() && stat.size > 0) return true;
      } catch {}
      // RNFS.stat may not support content:// URIs — fall back to native check
      return getMpvPlayerModule().verifyContentUri(uri);
    }
    const exists = await RNFS.exists(uri);
    if (!exists) return false;
    const stat = await RNFS.stat(uri);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Extract the file name from a URI.
 */
export function getFileName(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const segments = decoded.split(/[/\\]/);
  return segments[segments.length - 1] || 'Untitled';
}

// ─── Phase 18.2 — File Not Found Handling ──────────────────

export interface PlaybackError {
  type: 'file_not_found' | 'permission_denied' | 'unsupported_format' | 'corrupt' | 'network';
  uri: string;
  title: string;
  message: string;
}

/**
 * Handle a playback failure by returning a structured error.
 * @param uri — The file URI that failed to play.
 * @param errorMessage — Optional raw error message from the native player.
 */
export function handlePlaybackError(
  uri: string,
  errorMessage?: string,
): PlaybackError {
  if (!uri || uri.trim().length === 0) {
    return {
      type: 'file_not_found',
      uri,
      title: 'No File Selected',
      message: 'No media file is currently selected for playback.',
    };
  }

  if (errorMessage?.toLowerCase().includes('no such file') ||
      errorMessage?.toLowerCase().includes('not found') ||
      errorMessage?.toLowerCase().includes('enoent')) {
    return {
      type: 'file_not_found',
      uri,
      title: 'File Not Found',
      message: 'This file could not be opened. It may have been moved, renamed, or deleted.',
    };
  }

  if (errorMessage?.toLowerCase().includes('permission')) {
    return {
      type: 'permission_denied',
      uri,
      title: 'Permission Denied',
      message: 'The app no longer has access to this file. Try selecting it again.',
    };
  }

  if (errorMessage?.toLowerCase().includes('unsupported') ||
      errorMessage?.toLowerCase().includes('unknown format')) {
    return {
      type: 'unsupported_format',
      uri,
      title: 'Unsupported Format',
      message: 'This file format is not supported by the player.',
    };
  }

  // Default: treat unknown errors as corrupt
  return {
    type: 'corrupt',
    uri,
    title: 'Playback Failed',
    message: errorMessage || 'An unknown error occurred during playback.',
  };
}

// ─── Phase 18.3 — Network Error Handling ───────────────────

export interface NetworkError {
  type: 'timeout' | 'dns' | 'connection_refused' | 'ssl' | 'generic';
  url: string;
  message: string;
}

/**
 * Parse and structure network errors for streaming URLs.
 * Currently a skeleton for future streaming support.
 */
export function parseNetworkError(url: string, error: Error): NetworkError {
  const msg = error.message.toLowerCase();

  if (msg.includes('timeout')) {
    return {type: 'timeout', url, message: 'Connection timed out. Check your network and try again.'};
  }
  if (msg.includes('dns') || msg.includes('resolve')) {
    return {type: 'dns', url, message: 'Could not resolve the server address.'};
  }
  if (msg.includes('refused')) {
    return {type: 'connection_refused', url, message: 'The server refused the connection.'};
  }
  if (msg.includes('ssl') || msg.includes('certificate')) {
    return {type: 'ssl', url, message: 'SSL connection failed. The stream may have an invalid certificate.'};
  }
  return {type: 'generic', url, message: error.message};
}

// ══════════════════════════════════════════════════════════
// PHASE 25 — Media Scanner & Indexing Improvements
// ══════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────

export interface FileEntry {
  uri: string;
  name: string;
  /** File modification time (ms since epoch) */
  mtimeMs: number;
  /** File size in bytes */
  size: number;
  /** Whether this file is a directory */
  isDirectory: boolean;
}

/** Callback invoked during scanning to report progress. Return true to cancel. */
export type ScanProgressCallback = (progress: {
  /** The folder path currently being scanned */
  currentFolder: string;
  /** Files discovered so far (cumulative) */
  filesFound: number;
  /** Total files across all folders (estimated after folder enumeration) */
  totalFiles: number;
  /** Percentage complete 0–100 */
  percentComplete: number;
}) => boolean;

export interface IncrementalScanResult {
  /** New/missing files that need metadata extraction */
  files: FileEntry[];
  /** Files that existed before and are unmodified (skipped) */
  skippedCount: number;
  /** Number of files with unsupported extensions (not indexed) */
  unsupportedCount: number;
  /** Number of errors encountered during enumeration */
  errorsCount: number;
  /** The scan timestamp (ms) */
  scanTimestamp: number;
}

// ─── Audio / Video extension sets ─────────────────────

const SCAN_AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.aac', '.ogg', '.wma', '.m4a', '.opus',
]);

const SCAN_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg',
]);

const SCAN_MEDIA_EXTENSIONS = new Set<string>();
for (const e of SCAN_AUDIO_EXTENSIONS) SCAN_MEDIA_EXTENSIONS.add(e);
for (const e of SCAN_VIDEO_EXTENSIONS) SCAN_MEDIA_EXTENSIONS.add(e);

function isScanVideoExt(ext: string): boolean {
  return SCAN_VIDEO_EXTENSIONS.has(ext);
}

// ─── Helpers ───────────────────────────────────────────

/**
 * Parse a file name (no extension) into a display title.
 */
function fileNameToTitle(fileName: string): string {
  // Strip leading track number: "01 - Song" or "01. Song" or "01 Song"
  const cleaned = fileName.replace(/^\d+\s*[-.)\s]\s*/, '').trim();
  // Replace underscores with spaces
  return cleaned.replace(/_/g, ' ').trim() || fileName;
}

/**
 * Extract artist/album from folder hierarchy.
 * Given path segments like ["Music", "Artist Name", "Album Name", "file.mp3"],
 * returns {artist: "Artist Name", album: "Album Name"}.
 */
function extractFolderMetadata(filePath: string): {artist: string; album: string} {
  const segments = filePath.replace(/^file:\/\//, '').split('/').filter(Boolean);
  const parentDir = segments.length >= 2 ? segments[segments.length - 2] : '';
  const grandParentDir = segments.length >= 3 ? segments[segments.length - 3] : '';
  return {
    artist: grandParentDir || parentDir || 'Unknown Artist',
    album: parentDir || grandParentDir || 'Unknown Album',
  };
}

// ─── Core scanner ──────────────────────────────────────

/**
 * Recursively enumerate files in a folder, filtering for supported media
 * extensions. Returns a flat list of FileEntry objects.
 *
 * If `lastScanTimestamp` is provided, only returns files that are new or
 * have been modified since that timestamp (incremental scanning).
 */
async function enumerateMediaFiles(
  folderPath: string,
  lastScanTimestamp: number | null,
  onProgress?: ScanProgressCallback,
  cancelRef?: {current: boolean},
): Promise<{files: FileEntry[]; skippedCount: number; unsupportedCount: number; errorsCount: number}> {
  const results: FileEntry[] = [];
  let skippedCount = 0;
  let unsupportedCount = 0;
  let errorsCount = 0;

  async function walk(dir: string) {
    // Check cancellation
    if (cancelRef?.current) return;

    let items: RNFS.ReadDirItem[];
    try {
      items = await RNFS.readDir(dir);
    } catch {
      errorsCount++;
      return;
    }

    // Report progress for this folder
    if (onProgress) {
      const cancelled = onProgress({
        currentFolder: dir,
        filesFound: results.length,
        totalFiles: 0,
        percentComplete: 0,
      });
      if (cancelled && cancelRef) cancelRef.current = true;
    }

    for (const item of items) {
      if (cancelRef?.current) return;

      if (item.isDirectory()) {
        await walk(item.path);
        continue;
      }

      if (!item.isFile()) continue;

      const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
      if (!SCAN_MEDIA_EXTENSIONS.has(ext)) {
        unsupportedCount++;
        continue;
      }

      // Incremental: skip files not modified since last scan
      if (lastScanTimestamp !== null && item.mtime !== undefined) {
        const fileMtimeMs = item.mtime.getTime();
        if (fileMtimeMs <= lastScanTimestamp) {
          skippedCount++;
          continue;
        }
      }

      results.push({
        uri: item.path,
        name: item.name,
        mtimeMs: item.mtime?.getTime() ?? 0,
        size: item.size,
        isDirectory: false,
      });
    }
  }

  await walk(folderPath);
  return {files: results, skippedCount, unsupportedCount, errorsCount};
}

/**
 * Scan multiple folders with unified progress reporting.
 *
 * @param folderPaths   - List of folder URIs to scan
 * @param lastScanTimestamp - If provided, only scan files modified after this time (incremental)
 * @param onProgress    - Optional callback receiving per-folder progress; return true to cancel
 * @param cancelRef     - Mutable ref; set `.current = true` to cancel
 *
 * Returns an IncrementalScanResult with new/changed files and statistics.
 */
export async function scanFoldersIncremental(
  folderPaths: string[],
  lastScanTimestamp: number | null,
  onProgress?: ScanProgressCallback,
  cancelRef?: {current: boolean},
): Promise<IncrementalScanResult> {
  const allFiles: FileEntry[] = [];
  let totalSkipped = 0;
  let totalUnsupported = 0;
  let totalErrors = 0;
  let totalFiles = 0;

  if (folderPaths.length === 0) {
    return {
      files: [],
      skippedCount: 0,
      unsupportedCount: 0,
      errorsCount: 0,
      scanTimestamp: Date.now(),
    };
  }

  // Phase 1: Estimate total files by counting directories (lightweight)
  // For progress estimation, we use folder enumeration steps
  const totalFolders = folderPaths.length;

  // Phase 2: Scan each folder
  for (let i = 0; i < folderPaths.length; i++) {
    if (cancelRef?.current) break;

    const folder = folderPaths[i];
    const result = await enumerateMediaFiles(folder, lastScanTimestamp, onProgress, cancelRef);

    allFiles.push(...result.files);
    totalSkipped += result.skippedCount;
    totalUnsupported += result.unsupportedCount;
    totalErrors += result.errorsCount;
    totalFiles = allFiles.length;

    // Report progress
    if (onProgress) {
      const pct = Math.round(((i + 1) / totalFolders) * 100);
      const cancelled = onProgress({
        currentFolder: folder,
        filesFound: totalFiles,
        totalFiles,
        percentComplete: pct,
      });
      if (cancelled && cancelRef) cancelRef.current = true;
    }
  }

  return {
    files: allFiles,
    skippedCount: totalSkipped,
    unsupportedCount: totalUnsupported,
    errorsCount: totalErrors,
    scanTimestamp: Date.now(),
  };
}

/**
 * Convert a flat list of FileEntry results into ScannedTrack[] for the media store.
 * Uses folder hierarchy to infer artist/album metadata.
 */
export function fileEntriesToTracks(files: FileEntry[]): ScannedTrack[] {
  const map = new Map<string, ScannedTrack>();

  for (const f of files) {
    if (map.has(f.uri)) continue;

    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    const mediaType = isScanVideoExt(ext) ? 'video' : 'audio';
    const nameWithoutExt = f.name.slice(0, f.name.lastIndexOf('.')) || f.name;
    const folderMeta = extractFolderMetadata(f.uri);

    map.set(f.uri, {
      uri: f.uri,
      title: fileNameToTitle(nameWithoutExt),
      artist: folderMeta.artist,
      album: folderMeta.album,
      year: 0,
      genre: '',
      trackNumber: 0,
      duration: 0,
      albumArtUri: '',
      folderPath: f.uri.substring(0, f.uri.lastIndexOf('/')),
      folderId: linkedMediaFolderId(
        f.uri.substring(0, f.uri.lastIndexOf('/')),
        mediaType,
      ),
      source: 'local',
      type: mediaType,
      mediaType,
      sizeBytes: f.size,
      dateAdded: f.mtimeMs,
    });
  }

  return Array.from(map.values());
}
