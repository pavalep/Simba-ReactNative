// ─── M3U Parser & Generator ─────────────────────────────────
//
// Supports:
//   - Standard M3U (#EXTM3U header)
//   - Extended M3U with #EXTINF entries (duration, artist - title)
//   - Plain playlists (one URI per line)
//   - Export to M3U format

import {Platform} from 'react-native';
import type {PlaylistItem} from '../types/playlist';

// ─── Types ──────────────────────────────────────────────────

export interface M3uEntry {
  duration: number;
  title: string;
  artist?: string;
  fileUri: string;
}

export interface M3uParseResult {
  entries: M3uEntry[];
  errors: string[];
}

// ─── Regex ──────────────────────────────────────────────────

// #EXTINF:123,Artist Name - Track Title
const EXTINF_RE = /^#EXTINF:\s*(-?\d+)\s*,\s*(.*)$/;

// ─── Parse ──────────────────────────────────────────────────

/**
 * Parse M3U content string into structured entries.
 * Handles both extended (#EXTM3U) and plain M3U formats.
 */
export function parseM3u(content: string): M3uParseResult {
  const lines = content.split(/\r?\n/);
  const entries: M3uEntry[] = [];
  const errors: string[] = [];

  let currentExtinf: {duration: number; title: string; artist?: string} | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();

    // Skip blank lines, comments (except EXTINF), and header
    if (!raw || raw.startsWith('#EXTM3U') || raw.startsWith('#')) {
      if (raw.startsWith('#EXTINF:')) {
        const match = raw.match(EXTINF_RE);
        if (match) {
          const duration = Math.max(0, parseInt(match[1], 10) || -1);
          const rawTitle = match[2].trim();

          // Attempt to split "Artist - Title"
          const sepIdx = rawTitle.lastIndexOf(' - ');
          const artist =
            sepIdx > 0 ? rawTitle.substring(0, sepIdx).trim() : undefined;
          const title =
            sepIdx > 0
              ? rawTitle.substring(sepIdx + 3).trim()
              : rawTitle || 'Unknown';

          currentExtinf = {duration, title};
        } else {
          errors.push(`Line ${i + 1}: malformed #EXTINF directive`);
        }
      }
      continue;
    }

    // This line is a URI/path
    const fileUri = raw;

    // Validate URI (must not be empty or relative in a bad way)
    if (!fileUri || fileUri.startsWith('#')) {
      continue;
    }

    if (currentExtinf) {
      entries.push({
        duration: currentExtinf.duration,
        title: currentExtinf.title,
        artist: currentExtinf.artist,
        fileUri,
      });
      currentExtinf = null;
    } else {
      // Plain M3U — no EXTINF metadata available
      const name = fileUri.split('/').pop()?.split('\\').pop() ?? 'Unknown';
      entries.push({
        duration: -1,
        title: stripExtension(name),
        fileUri,
      });
    }
  }

  return {entries, errors};
}

// ─── Generate ───────────────────────────────────────────────

/**
 * Generate M3U content string from a list of PlaylistItems.
 */
export function generateM3u(items: PlaylistItem[]): string {
  const lines: string[] = ['#EXTM3U'];

  for (const item of items) {
    const artistPart = item.artist ? `${item.artist} - ` : '';
    const titleLine = `${artistPart}${item.title}`;
    lines.push(`#EXTINF:${Math.floor(item.duration / 1000)},${titleLine}`);
    lines.push(item.fileUri);
  }

  return lines.join('\n');
}

/**
 * Generate a JSON export string from a list of PlaylistItems.
 */
export function generatePlaylistJson(items: PlaylistItem[]): string {
  return JSON.stringify(
    items.map(item => ({
      title: item.title,
      artist: item.artist ?? null,
      album: item.album ?? null,
      duration: item.duration,
      fileUri: item.fileUri,
      thumbnailPath: item.thumbnailPath ?? null,
    })),
    null,
    2,
  );
}

// ─── File name helpers ──────────────────────────────────────

/**
 * Create a sanitised file name for export (no extension).
 */
export function getExportFileName(playlistName: string): string {
  const safe = playlistName.replace(/[<>:"/\\|?*]/g, '_').trim();
  return safe || 'playlist';
}

/**
 * Get the MIME type for M3U files.
 */
export function getM3uMimeType(): string {
  return Platform.OS === 'android'
    ? 'audio/x-mpegurl'
    : 'audio/mpegurl';
}

/**
 * Get a suggested file URI for sharing an M3U file on the device.
 */
export function getExportFilePath(
  playlistName: string,
  format: 'm3u' | 'json' = 'm3u',
): string {
  const baseName = getExportFileName(playlistName);
  const ext = format === 'm3u' ? '.m3u' : '.json';
  return `${baseName}${ext}`;
}

// ─── Internal helpers ───────────────────────────────────────

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.substring(0, dot) : fileName;
}
