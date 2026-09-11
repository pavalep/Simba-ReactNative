/**
 * V18 + V21 W6 P21c — audiusAdapter
 *
 * Replaces `audiusService.ts`. Type contract (see SPEC §2):
 *   *Raw DTOs are file-local; *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `parseAudiusListEnvelope` validates the `{data: T[]}` envelope
 * (no status field — Audius returns HTTP 200 with `data: []` on
 * empty results) and `parseRawAudiusTrack` validates per-track
 * shape. Malformed inputs throw `AdapterParseError` (was silent
 * `null` skip pre-W22). All 3 service functions accept
 * `signal?: AbortSignal` so TanStack Query can cancel stale
 * requests on screen unmount / query-key change.
 *
 * The Jamendo adapter (`src/infrastructure/api/jamendo/adapter.ts`)
 * is the proof-of-pattern reference for the W6 P21c shape; this
 * file follows the same pattern (with one envelope vs Jamendo's
 * two: Audius has only the `data` field, no status).
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {AudiusTrackResult, ApiSearchOptions} from '../../../types/api';

// Re-export the domain type so consumers can do
// `import type {AudiusTrackResult} from '../infrastructure/api/audius/adapter'`.
export type {AudiusTrackResult};

const AUDIUS_API_PATH = '/v1/tracks';

interface AudiusTrackRaw {
  id: string;
  title: string;
  duration: number;
  genre: string;
  description: string;
  user: {id: string; name: string; handle: string};
  artwork?: {_480x480: string; _1000x1000: string};
}

interface AudiusListRaw {
  data?: AudiusTrackRaw[];
}

interface AudiusSingleRaw {
  data?: AudiusTrackRaw;
}

/**
 * Build the stream URL. Audius redirects the stream request to the
 * discovery node that holds the audio; we just construct the well-
 * known shape.
 */
function buildStreamUrl(trackId: string): string {
  return `${API_CONFIG.audius.baseUrl}${AUDIUS_API_PATH}/${trackId}/stream`;
}

function resolveArtworkUrl(track: AudiusTrackRaw): string {
  return track.artwork?._480x480
    ? `https://creatornode.audius.co/ipfs/${track.artwork._480x480}`
    : '';
}

/**
 * V21 W6 P21c — per-track shape validation.
 *
 * Pre-W22, `trackResultFromRaw` returned `null` for malformed /
 * undefined input and the caller filtered it out — the user saw
 * fewer results than the API returned, with no diagnostic. Now
 * a malformed track is a typed `AdapterParseError` failure (the
 * whole batch is rejected; the call site / hook layer can decide
 * whether to retry or surface a toast).
 */
function parseRawAudiusTrack(
  raw: unknown,
  path: string,
): AudiusTrackResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'audius',
      path,
      'expected track object',
    );
  }
  const t = raw as Partial<AudiusTrackRaw>;
  if (typeof t.id !== 'string' || t.id.length === 0) {
    throw new AdapterParseError(
      'audius',
      `${path}.id`,
      'expected non-empty string id',
    );
  }
  if (typeof t.title !== 'string') {
    throw new AdapterParseError(
      'audius',
      `${path}.title`,
      'expected string',
    );
  }
  if (typeof t.duration !== 'number' || t.duration < 0) {
    throw new AdapterParseError(
      'audius',
      `${path}.duration`,
      `expected non-negative number, got ${t.duration}`,
    );
  }
  // `user` is required for the result's `artistName` / `artistId`.
  if (
    typeof t.user !== 'object' ||
    t.user === null ||
    typeof t.user.id !== 'string' ||
    typeof t.user.name !== 'string'
  ) {
    throw new AdapterParseError(
      'audius',
      `${path}.user`,
      'expected object with id + name',
    );
  }
  return {
    id: t.id,
    title: t.title,
    artistName: t.user.name || 'Unknown Artist',
    artistId: t.user.id || '',
    duration: t.duration,
    genre: t.genre || '',
    streamUrl: buildStreamUrl(t.id),
    artworkUrl: resolveArtworkUrl(t as AudiusTrackRaw),
    description: t.description || '',
  };
}

/**
 * V21 W6 P21c — typed envelope validation (list variant).
 *
 * Audius has no `status` field; the envelope is `{data?: T[]}` and
 * empty results are valid (`{data: []}`). We only reject when
 * `data` is present but not an array (an upstream API breakage or
 * malicious payload).
 */
function parseAudiusListEnvelope(
  raw: unknown,
  path: string,
): AudiusTrackRaw[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'audius',
      `${path}`,
      'expected object envelope',
    );
  }
  const e = raw as Partial<AudiusListRaw>;
  if (e.data === undefined) return [];
  if (!Array.isArray(e.data)) {
    throw new AdapterParseError(
      'audius',
      `${path}.data`,
      'expected array of tracks',
    );
  }
  return e.data;
}

/**
 * V21 W6 P21c — typed envelope validation (single variant).
 * Returns `null` if `data` is missing (the API returns
 * `{data: null}` or `{}` for a missing track — not an error).
 */
function parseAudiusSingleEnvelope(raw: unknown): AudiusTrackRaw | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'audius',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<AudiusSingleRaw>;
  if (e.data === undefined || e.data === null) return null;
  return e.data;
}

/**
 * List convertor. Validates the envelope + parses each track.
 */
export function trackResultsFromListRaw(raw: unknown): AudiusTrackResult[] {
  const tracks = parseAudiusListEnvelope(raw, 'envelope');
  return tracks.map((t, i) => parseRawAudiusTrack(t, `data[${i}]`));
}

/**
 * V21 W6 P21c — thin wrapper around `parseRawAudiusTrack`.
 *
 * Pre-W22 returned `null` for malformed / undefined input and the
 * caller filtered it out. The new contract throws `AdapterParseError`
 * (per W6 P21c's "fail loud on bad data" intent). This wrapper
 * exists so the convertor-name `trackResultFromRaw` stays exported
 * for `simpleAdapters.test.ts` (the V18 happy-path test).
 */
export function trackResultFromRaw(
  raw: unknown,
  path: string = 'track',
): AudiusTrackResult {
  return parseRawAudiusTrack(raw, path);
}

export async function searchAudiusTracks(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiusTrackResult[]> {
  const raw = await apiFetch<AudiusListRaw>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/search`,
    params: {
      query,
      limit: options?.limit ?? 10,
      offset: options?.page ? (options.page - 1) * (options.limit ?? 10) : 0,
    },
    signal,
  });
  return trackResultsFromListRaw(raw);
}

export async function getTrendingAudiusTracks(
  limit: number = 20,
  signal?: AbortSignal,
): Promise<AudiusTrackResult[]> {
  const raw = await apiFetch<AudiusListRaw>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/trending`,
    params: {limit},
    signal,
  });
  return trackResultsFromListRaw(raw);
}

export async function getAudiusTrackById(
  id: string,
  signal?: AbortSignal,
): Promise<AudiusTrackResult | null> {
  try {
    const raw = await apiFetch<AudiusSingleRaw>({
      config: API_CONFIG.audius,
      path: `${AUDIUS_API_PATH}/${id}`,
      signal,
    });
    const track = parseAudiusSingleEnvelope(raw);
    return track
      ? parseRawAudiusTrack(track, 'data')
      : null;
  } catch (e) {
    // V21 W6 P21c: distinguish transport-level failures
    // (`ApiError` from apiFetch + `AbortError` on signal abort)
    // from wire-shape failures (`AdapterParseError`). Transport
    // errors are still swallowed — the caller's intent is
    // "tell me whether this track exists, with null meaning
    // 'no'". Wire-shape failures propagate so the hook layer
    // / caller can distinguish "server is down" from "server
    // returned garbage".
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const AUDIUS_RETRIES = 2;
