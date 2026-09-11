/**
 * V18 + V21 W6 P21c — jamendoAdapter
 *
 * Replaces `jamendoService.ts`. The wire shape is the Jamendo v3
 * response envelope `{headers: {status}, results: T[]}`.
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `parseJamendoEnvelope` (renamed from `unwrapJamendoResults`)
 * throws `AdapterParseError` on envelope failure so the wire-
 * shape failure is distinguishable from a transport `ApiError`
 * in catch blocks. `parseRawJamendoTrack` does the per-track
 * shape check; a malformed track is a `AdapterParseError`
 * failure (not a silent `null` skip). All 4 service functions
 * accept `signal?: AbortSignal` so TanStack Query can cancel
 * stale requests on screen unmount / query-key change.
 *
 * The Podcast Index adapter (`src/infrastructure/api/podcastIndex/
 * adapter.ts`) is the proof-of-pattern reference; this file
 * follows the same shape.
 *
 * `getPopularJamendoTracks` is a special case: it tries multiple
 * `order` params (Jamendo's per-order availability is unreliable)
 * and remembers the first one that yields rows. The fallback chain
 * stays in the service function (not the convertor) because it's
 * HTTP-fan-out, not data shape.
 */
import {apiFetch, ApiError} from '../apiClient';
import {ENV} from '../../../constants/env';
import {AdapterParseError} from '../adapterErrors';
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
 * V21 W6 P21c — typed envelope validation.
 *
 * Jamendo returns HTTP 200 even when the request failed (missing
 * `client_id`, etc.). The real status lives at `headers.status`.
 * Throw `AdapterParseError` so the call site can distinguish
 * wire-shape failures from transport `ApiError` in catch blocks.
 */
function parseJamendoEnvelope<T>(
  data: JamendoResponseRaw<T> | undefined,
): T[] {
  if (data?.headers?.status !== 'success') {
    const code = data?.headers?.code ?? 0;
    const message = data?.headers?.error_message ?? 'Jamendo request failed.';
    throw new AdapterParseError(
      'jamendo',
      'envelope.status',
      `[${code}] ${message}`,
    );
  }
  if (!Array.isArray(data.results)) {
    throw new AdapterParseError(
      'jamendo',
      'envelope.results',
      'expected array of tracks',
    );
  }
  return data.results;
}

/**
 * V21 W6 P21c — per-track shape validation.
 *
 * Pre-W22, `trackResultFromRaw` returned `null` on a malformed
 * track and the caller filtered it out silently — the user saw
 * fewer results than the API returned, with no diagnostic. Now
 * a malformed track is a typed `AdapterParseError` failure (the
 * whole batch is rejected; the call site / hook layer can decide
 * whether to retry or surface a toast).
 */
function parseRawJamendoTrack(
  raw: unknown,
  path: string,
): JamendoTrackResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'jamendo',
      path,
      'expected track object',
    );
  }
  const t = raw as Partial<JamendoTrackRaw>;
  if (typeof t.id !== 'string' || t.id.length === 0) {
    throw new AdapterParseError(
      'jamendo',
      `${path}.id`,
      'expected non-empty string id',
    );
  }
  const id = parseInt(t.id, 10);
  if (!Number.isFinite(id)) {
    throw new AdapterParseError(
      'jamendo',
      `${path}.id`,
      `id "${t.id}" is not a finite integer`,
    );
  }
  if (typeof t.name !== 'string') {
    throw new AdapterParseError(
      'jamendo',
      `${path}.name`,
      'expected string',
    );
  }
  if (typeof t.audio !== 'string' || t.audio.length === 0) {
    throw new AdapterParseError(
      'jamendo',
      `${path}.audio`,
      'expected non-empty audio url',
    );
  }
  if (typeof t.duration !== 'number' || t.duration < 0) {
    throw new AdapterParseError(
      'jamendo',
      `${path}.duration`,
      `expected non-negative number, got ${t.duration}`,
    );
  }
  return {
    id,
    name: t.name,
    artistName: t.artist_name ?? '',
    albumName: t.album_name ?? '',
    duration: t.duration,
    audioUrl: t.audio,
    imageUrl: t.image ?? '',
    genreName: t.genre_name ?? '',
  };
}

export function trackResultsFromResponseRaw(
  raw: JamendoResponseRaw<JamendoTrackRaw> | undefined,
): JamendoTrackResult[] {
  const tracks = parseJamendoEnvelope(raw);
  return tracks.map((t, i) => parseRawJamendoTrack(t, `results[${i}]`));
}

/**
 * V21 W6 P21c — thin wrapper around `parseRawJamendoTrack`.
 *
 * Pre-W22 returned `null` for malformed / undefined input and the
 * caller filtered it out. The new contract throws `AdapterParseError`
 * (per W6 P21c's "fail loud on bad data" intent). This wrapper
 * exists so the convertor-name `trackResultFromRaw` stays
 * exported for `simpleAdapters.test.ts` (the V18 happy-path test)
 * and any other consumer that imports it by name. The path
 * argument defaults to `'track'` so the error message reads
 * `[jamendo] track.<field>: ...` for an unwrapped single-track
 * call (vs `[jamendo] results[3].<field>: ...` for the
 * envelope path).
 */
export function trackResultFromRaw(
  raw: unknown,
  path: string = 'track',
): JamendoTrackResult {
  return parseRawJamendoTrack(raw, path);
}

export async function searchJamendoTracks(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
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
    signal,
  });
  return trackResultsFromResponseRaw(raw);
}

export async function getJamendoTracksByGenre(
  genre: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
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
    signal,
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
  signal?: AbortSignal,
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
      signal,
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
  signal?: AbortSignal,
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
      signal,
    });
    const list = parseJamendoEnvelope(raw);
    return list.length > 0
      ? parseRawJamendoTrack(list[0], 'results[0]')
      : null;
  } catch (e) {
    // V21 W6 P21c: distinguish transport-level failures
    // (`ApiError` from apiFetch + `AbortError` on signal abort)
    // from wire-shape failures (`AdapterParseError`). Transport
    // errors are still swallowed — the caller's intent is
    // "tell me whether this track exists, with null meaning
    // 'no'". Wire-shape failures propagate so the hook layer
    // / caller can distinguish "server is down" from "server
    // returned garbage" and surface an explicit diagnostic.
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const JAMENDO_RETRIES = 2;

