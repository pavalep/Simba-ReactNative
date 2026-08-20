import RNFS from 'react-native-fs';
import MpvPlayer from '../native/player.api';
import {LrcParseResult, parseLrc} from '../utils/lrcParser';
import type {ScannedTrack} from '../store/slices/mediaSlice';
import {linkedMediaFolderIdFromPath} from '../types/media';

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
  // 1. Read mpv metadata property
  let rawJson = '{}';
  try {
    rawJson = String(MpvPlayer.getProperty('metadata') ?? '{}');
  } catch {
    // player not initialised
  }
  const raw = parseMpvMetadata(rawJson);

  // 2. Read media-title (mpv's best-guess title)
  let mediaTitle = '';
  try {
    mediaTitle = String(MpvPlayer.getProperty('media-title') ?? '');
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
 * Recursively scan a folder for audio files and return partial ScannedTrack
 * entries.  Does **not** compute duration (caller may obtain it via mpv or
 * ffprobe when the file is played).
 */
export async function scanFolderForAudio(
  folderPath: string,
): Promise<ScannedTrack[]> {
  const results: ScannedTrack[] = [];

  try {
    const items = await RNFS.readDir(folderPath);
    const subDirPromises: Promise<ScannedTrack[]>[] = [];

    for (const item of items) {
      if (item.isDirectory()) {
        subDirPromises.push(scanFolderForAudio(item.path));
      } else if (item.isFile()) {
        const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
        if (!AUDIO_EXTENSIONS.has(ext)) continue;

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
    // Folder may not exist or permission denied — skip silently
  }

  return results;
}

/**
 * Scan multiple audio folders and return a deduplicated list of tracks.
 */
export async function scanAudioFolders(
  folderPaths: string[],
): Promise<ScannedTrack[]> {
  const all = await Promise.all(folderPaths.map(scanFolderForAudio));
  const map = new Map<string, ScannedTrack>();
  for (const arr of all) {
    for (const t of arr) {
      // Deduplicate by URI
      if (!map.has(t.uri)) map.set(t.uri, t);
    }
  }
  return Array.from(map.values());
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
