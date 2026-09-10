/**
 * V18 — jamendoAdapter
 *
 * Replaces `jamendoService.ts`. The wire shape is the Jamendo v3
 * response envelope `{headers: {status}, results: T[]}`. The
 * `assertJamendoSuccess` helper throws an ApiError on `status !==
 * 'success'` so call sites get the same error path as a transport
 * failure. The convertors handle the post-success shape only.
 *
 * `getPopularJamendoTracks` is a special case: it tries multiple
 * `order` params (Jamendo's per-order availability is unreliable)
 * and remembers the first one that yields rows. The fallback chain
 * stays in the service function (not the convertor) because it's
 * HTTP-fan-out, not data shape.
 */
import {apiFetch, ApiError} from '../apiClient';
import {ENV} from '../../../constants/env';
import type {JamendoTrackResult, ApiSearchOptions} from '../../../types/api';

export type {JamendoTrackResult};

const JAMENDO_CONFIG = {
  baseUrl: 'https://api.jamendo.com/v3.0',
};

const clientId = (): string => ENV.JAMENDO_CLIENT_ID;

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

interface JamendoResponseRaw<T> {
  headers: {
    status: 'success' | 'error';
    code?: number;
    error_message?: string;
    results_count?: number;
  };
  results: T[];
}

/**
 * Jamendo returns HTTP 200 even when the request failed (missing
 * `client_id`, etc.). The real status lives at `headers.status`.
 * Throw an ApiError so the call site treats it the same as a
 * transport failure.
 */
function unwrapJamendoResults<T>(data: JamendoResponseRaw<T> | undefined): T[] {
  if (data?.headers?.status !== 'success') {
    const code = data?.headers?.code ?? 0;
    const message = data?.headers?.error_message ?? 'Jamendo request failed.';
    throw new ApiError(`[${code}] ${message}`, 200);
  }
  return Array.isArray(data.results) ? data.results : [];
}

export function trackResultFromRaw(
  raw: JamendoTrackRaw | undefined,
): JamendoTrackResult | null {
  if (!raw) return null;
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

export function trackResultsFromResponseRaw(
  raw: JamendoResponseRaw<JamendoTrackRaw> | undefined,
): JamendoTrackResult[] {
  return unwrapJamendoResults(raw)
    .map(trackResultFromRaw)
    .filter((t): t is JamendoTrackResult => t !== null);
}

export async function searchJamendoTracks(
  query: string,
  options?: ApiSearchOptions,
): Promise<JamendoTrackResult[]> {
  const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
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
  });
  return trackResultsFromResponseRaw(raw);
}

export async function getJamendoTracksByGenre(
  genre: string,
  options?: ApiSearchOptions,
): Promise<JamendoTrackResult[]> {
  const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
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
  });
  return trackResultsFromResponseRaw(raw);
}

const POPULAR_FALLBACK_ORDERS = [
  'popularity_week',
  'buzzrate',
  'releasedate',
  'relevance',
] as const;

let cachedWorkingOrder: string | null = null;

function preferredOrder(): readonly string[] {
  if (cachedWorkingOrder) {
    return [
      cachedWorkingOrder,
      ...POPULAR_FALLBACK_ORDERS.filter(o => o !== cachedWorkingOrder),
    ];
  }
  return POPULAR_FALLBACK_ORDERS;
}

export async function getPopularJamendoTracks(
  limit: number = 20,
  page: number = 1,
): Promise<JamendoTrackResult[]> {
  let lastEmpty: JamendoTrackResult[] = [];
  for (const order of preferredOrder()) {
    const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
      config: JAMENDO_CONFIG,
      path: '/tracks/',
      params: {
        client_id: clientId(),
        format: 'json',
        limit,
        offset: (page - 1) * limit,
        include: 'musicinfo',
        order,
      },
    });
    const results = trackResultsFromResponseRaw(raw);
    if (results.length > 0) {
      cachedWorkingOrder = order;
      return results;
    }
    lastEmpty = results;
  }
  return lastEmpty;
}

export async function getJamendoTrackById(
  id: number,
): Promise<JamendoTrackResult | null> {
  try {
    const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
      config: JAMENDO_CONFIG,
      path: '/tracks/',
      params: {
        client_id: clientId(),
        format: 'json',
        id,
      },
    });
    const list = unwrapJamendoResults(raw);
    return list.length > 0 ? trackResultFromRaw(list[0]) : null;
  } catch {
    return null;
  }
}
import {AdapterParseError} from '../adapterErrors';

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const JAMENDO_RETRIES = 2;
