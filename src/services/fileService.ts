import {pick, types} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

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

  // 2. Permission check — try to stat the file
  let stat: RNFS.StatResult;
  try {
    stat = await RNFS.stat(uri);
  } catch (err: any) {
    // EACCES / EPERM / ENOENT — permission or not found
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
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

  // 3. Is it actually a file?
  if (!stat.isFile()) {
    return {
      valid: false,
      title: 'Not a File',
      message: 'The selected path is not a regular file.',
      detail: uri,
    };
  }

  // 4. Empty file check
  if (stat.size === 0) {
    return {
      valid: false,
      title: 'Empty File',
      message: 'The selected file is empty (0 bytes) and cannot be played.',
      detail: `${getFileName(uri)} — 0 bytes`,
    };
  }

  // 5. Extension sanity check (warn but don't block)
  const ext = getExtension(uri);
  if (ext && !MEDIA_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      title: 'Unsupported Format',
      message: `".${ext}" files are not recognized as a supported media format. The player may not be able to play this file.`,
      detail: `Unknown extension: .${ext}`,
    };
  }

  // 6. Suspiciously small file (< 100 bytes) — likely corrupt or invalid
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
    });
    if (!result) return null;

    return {
      uri: result.uri,
      title: result.name ?? 'Untitled',
      type: result.type ?? null,
      size: result.size ?? null,
    };
  } catch (err: any) {
    // User cancelled — not an error
    if (err?.code === 'OPERATION_CANCELED') return null;
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
  } catch (err: any) {
    if (err?.code === 'OPERATION_CANCELED') return null;
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
 */
export async function checkFileExists(uri: string): Promise<boolean> {
  try {
    if (uri.startsWith('content://')) {
      const stat = await RNFS.stat(uri);
      return stat.isFile() && stat.size > 0;
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
