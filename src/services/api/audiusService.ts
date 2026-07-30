// ─── Audius API Service ──────────────────────────────────────────────────
// Fetches full-length free music tracks from the Audius decentralized
// streaming network. No API key required for read-only queries.
//
// Key features:
//   - Full-length 320kbps streams (not 30s previews)
//   - Trending tracks, search, genre discovery
//   - 500k requests/month free tier (with optional API key)
//
// See https://docs.audius.org/api

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {AudiusTrackResult, ApiSearchOptions} from '../../types/api';

// ─── Raw API response types ───────────────────────────────────────────

interface AudiusTrackRaw {
  id: string;
  title: string;
  duration: number;
  genre: string;
  description: string;
  user: {
    id: string;
    name: string;
    handle: string;
  };
  artwork?: {
    _480x480: string;
    _1000x1000: string;
  };
}

interface AudiusListResponse {
  data: AudiusTrackRaw[];
}

interface AudiusSingleResponse {
  data: AudiusTrackRaw;
}

// ─── Constants ─────────────────────────────────────────────────────────

const AUDIUS_API_PATH = '/v1/tracks';

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Resolve artwork URL from an Audius track artwork object.
 * Falls back to a placeholder if no artwork is available.
 */
function resolveArtworkUrl(track: AudiusTrackRaw): string {
  if (track.artwork?._480x480) {
    return `https://creatornode.audius.co/ipfs/${track.artwork._480x480}`;
  }
  return '';
}

/**
 * Build the stream URL for a track.
 * Audius stream URLs redirect to the actual audio content on a discovery node.
 */
function buildStreamUrl(trackId: string): string {
  return `${API_CONFIG.audius.baseUrl}${AUDIUS_API_PATH}/${trackId}/stream`;
}

/**
 * Map raw Audius track to our result type.
 */
function mapTrack(raw: AudiusTrackRaw): AudiusTrackResult {
  return {
    id: raw.id,
    title: raw.title,
    artistName: raw.user?.name || 'Unknown Artist',
    artistId: raw.user?.id || '',
    duration: raw.duration,
    genre: raw.genre || '',
    streamUrl: buildStreamUrl(raw.id),
    artworkUrl: resolveArtworkUrl(raw),
    description: raw.description || '',
  };
}

// ─── Public API functions ─────────────────────────────────────────────

/**
 * Search tracks on Audius by query.
 * Returns full-length streamable tracks (not previews).
 */
export async function searchAudiusTracks(
  query: string,
  options?: ApiSearchOptions,
): Promise<AudiusTrackResult[]> {
  const response = await apiFetch<AudiusListResponse>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/search`,
    params: {
      query,
      limit: options?.limit ?? 10,
      offset: options?.page ? (options.page - 1) * (options.limit ?? 10) : 0,
    },
    cacheTtlMs: 60_000,
  });
  return (response.data ?? []).map(mapTrack);
}

/**
 * Get trending tracks on Audius.
 */
export async function getTrendingAudiusTracks(
  limit: number = 20,
): Promise<AudiusTrackResult[]> {
  const response = await apiFetch<AudiusListResponse>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/trending`,
    params: {
      limit,
    },
    cacheTtlMs: 120_000,
  });
  return (response.data ?? []).map(mapTrack);
}

/**
 * Get a single track by ID from Audius.
 * Returns full track details including stream URL.
 */
export async function getAudiusTrackById(
  id: string,
): Promise<AudiusTrackResult | null> {
  try {
    const response = await apiFetch<AudiusSingleResponse>({
      config: API_CONFIG.audius,
      path: `${AUDIUS_API_PATH}/${id}`,
      cacheTtlMs: 300_000,
    });
    return response.data ? mapTrack(response.data) : null;
  } catch {
    return null;
  }
}

/**
 * Get tracks by genre on Audius.
 * Uses tagged/feed endpoint filtered by genre tag.
 */
export async function getAudiusTracksByGenre(
  genre: string,
  limit: number = 10,
): Promise<AudiusTrackResult[]> {
  // Audius doesn't have a direct genre filter on search, so use trending
  // with genre filtering applied client-side from search results
  const allTrending = await getTrendingAudiusTracks(50);
  const q = genre.toLowerCase();
  return allTrending
    .filter(t => t.genre.toLowerCase().includes(q))
    .slice(0, limit);
}
