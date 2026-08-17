// ─── Jamendo API Service ───────────────────────────────────────────────
// Fetches full-length CC-licensed music tracks with direct stream URLs.
// Requires a free Client ID from https://developer.jamendo.com/
//
// Key features:
//   - Full-length MP3/stream URLs (not 30s previews like iTunes/Deezer)
//   - Genres, albums, artists
//   - Popular tracks, genre-based discovery
//
// See https://developer.jamendo.com/v3.0

import {apiFetch, ApiError} from './apiClient';
import {ENV} from '../../constants/env';
import type {
  JamendoTrackResult,
  ApiSearchOptions,
} from '../../types/api';

// ─── Jamendo-specific config (dynamic base URL due to client_id) ──────

const JAMENDO_CONFIG = {
  baseUrl: 'https://api.jamendo.com/v3.0',
  rateLimitMs: 200,
};

const clientId = (): string => {
  // Returns the configured client_id. If unset, Jamendo will reject the
  // request with headers.status='error' which assertJamendoSuccess
  // surfaces as a normal ApiError to the caller.
  return ENV.JAMENDO_CLIENT_ID;
};

// ─── Raw API response types ───────────────────────────────────────────

interface JamendoTrackRaw {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  duration: number;
  audio: string;
  image: string;
  genre_name: string;
}

interface JamendoResponse<T> {
  headers: {
    status: 'success' | 'error';
    code?: number;
    error_message?: string;
    results_count?: number;
  };
  results: T[];
}

/**
 * Jamendo returns HTTP 200 even when the request fails (e.g. missing or
 * invalid `client_id`). The real status lives in the response body at
 * `headers.status`. This helper throws an ApiError when the API reports
 * an error, so the call sites can handle it the same way as a transport
 * failure instead of silently returning an empty list.
 */
function assertJamendoSuccess<T>(data: JamendoResponse<T>): T[] {
  if (data?.headers?.status !== 'success') {
    const code = data?.headers?.code ?? 0;
    const message =
      data?.headers?.error_message ?? 'Jamendo request failed.';
    throw new ApiError(`[${code}] ${message}`, 200);
  }
  return Array.isArray(data.results) ? data.results : [];
}

// ─── Mappers ──────────────────────────────────────────────────────────

function mapTrack(raw: JamendoTrackRaw): JamendoTrackResult {
  return {
    id: parseInt(raw.id, 10),
    name: raw.name,
    artistName: raw.artist_name,
    albumName: raw.album_name,
    duration: raw.duration,
    audioUrl: raw.audio,
    imageUrl: raw.image,
    genreName: raw.genre_name || '',
  };
}

// ─── Public API functions ─────────────────────────────────────────────

/** Search full-length tracks on Jamendo. */
export async function searchJamendoTracks(
  query: string,
  options?: ApiSearchOptions,
): Promise<JamendoTrackResult[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrackRaw>>({
    config: JAMENDO_CONFIG,
    path: '/tracks/',
    params: {
      client_id: clientId(),
      format: 'json',
      search: query,
      limit: options?.limit ?? 10,
      page: options?.page ?? 1,
      include: 'musicinfo',
    },
    cacheTtlMs: 60_000,
  });
  return assertJamendoSuccess(data).map(mapTrack);
}

/** Get popular tracks by genre (genre name, e.g. 'rock', 'pop', 'jazz'). */
export async function getJamendoTracksByGenre(
  genre: string,
  options?: ApiSearchOptions,
): Promise<JamendoTrackResult[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrackRaw>>({
    config: JAMENDO_CONFIG,
    path: '/tracks/',
    params: {
      client_id: clientId(),
      format: 'json',
      tags: genre,
      limit: options?.limit ?? 10,
      page: options?.page ?? 1,
      include: 'musicinfo',
      order: 'popularity_total',
    },
    cacheTtlMs: 120_000,
  });
  return assertJamendoSuccess(data).map(mapTrack);
}

/**
 * Get globally popular tracks on Jamendo (the FAB-only "All" stream).
 * `page` is backward-compatible (defaults to 1) so existing single-fetch
 * callers keep working while the Music screen paginates the stream.
 */
export async function getPopularJamendoTracks(
  limit: number = 20,
  page: number = 1,
): Promise<JamendoTrackResult[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrackRaw>>({
    config: JAMENDO_CONFIG,
    path: '/tracks/',
    params: {
      client_id: clientId(),
      format: 'json',
      limit,
      page,
      include: 'musicinfo',
      order: 'popularity_total',
    },
    cacheTtlMs: 120_000,
  });
  return assertJamendoSuccess(data).map(mapTrack);
}

/** Get a single track by ID (includes full stream URL in track.audioUrl). */
export async function getJamendoTrackById(
  id: number,
): Promise<JamendoTrackResult | null> {
  try {
    const data = await apiFetch<JamendoResponse<JamendoTrackRaw>>({
      config: JAMENDO_CONFIG,
      path: '/tracks/',
      params: {
        client_id: clientId(),
        format: 'json',
        id,
      },
      cacheTtlMs: 300_000,
    });
    const list = assertJamendoSuccess(data);
    return list.length > 0 ? mapTrack(list[0]) : null;
  } catch {
    return null;
  }
}
