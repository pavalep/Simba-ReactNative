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

import {apiFetch} from './apiClient';
import {ENV} from '../../constants/env';
import type {
  JamendoTrackResult,
  JamendoAlbumResult,
  ApiSearchOptions,
} from '../../types/api';

// ─── Jamendo-specific config (dynamic base URL due to client_id) ──────

const JAMENDO_CONFIG = {
  baseUrl: 'https://api.jamendo.com/v3.0',
  rateLimitMs: 200,
};

const clientId = (): string => {
  if (!ENV.JAMENDO_CLIENT_ID || ENV.JAMENDO_CLIENT_ID === 'your_jamendo_client_id_here') {
    console.warn('Jamendo client_id not set — API calls will fail until configured.');
  }
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

interface JamendoAlbumRaw {
  id: string;
  name: string;
  artist_name: string;
  releasedate: string;
  image: string;
  track_count: string;
}

interface JamendoResponse<T> {
  results: {headers: Record<string, unknown>; list: T[]};
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

function mapAlbum(raw: JamendoAlbumRaw): JamendoAlbumResult {
  return {
    id: parseInt(raw.id, 10),
    name: raw.name,
    artistName: raw.artist_name,
    releaseDate: raw.releasedate,
    imageUrl: raw.image,
    trackCount: parseInt(raw.track_count, 10) || 0,
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
      include: 'musicinfo',
    },
    cacheTtlMs: 60_000,
  });
  return (data.results?.list ?? []).map(mapTrack);
}

/** Search albums on Jamendo. */
export async function searchJamendoAlbums(
  query: string,
  options?: ApiSearchOptions,
): Promise<JamendoAlbumResult[]> {
  const data = await apiFetch<JamendoResponse<JamendoAlbumRaw>>({
    config: JAMENDO_CONFIG,
    path: '/albums/',
    params: {
      client_id: clientId(),
      format: 'json',
      search: query,
      limit: options?.limit ?? 10,
    },
    cacheTtlMs: 60_000,
  });
  return (data.results?.list ?? []).map(mapAlbum);
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
      include: 'musicinfo',
      order: 'popularity_total',
    },
    cacheTtlMs: 120_000,
  });
  return (data.results?.list ?? []).map(mapTrack);
}

/** Get globally popular tracks on Jamendo. */
export async function getPopularJamendoTracks(
  limit: number = 20,
): Promise<JamendoTrackResult[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrackRaw>>({
    config: JAMENDO_CONFIG,
    path: '/tracks/',
    params: {
      client_id: clientId(),
      format: 'json',
      limit,
      include: 'musicinfo',
      order: 'popularity_total',
    },
    cacheTtlMs: 120_000,
  });
  return (data.results?.list ?? []).map(mapTrack);
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
    const list = data.results?.list ?? [];
    return list.length > 0 ? mapTrack(list[0]) : null;
  } catch {
    return null;
  }
}
