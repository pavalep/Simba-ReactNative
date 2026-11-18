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
import {apiFetch} from '../apiClient';
import {ENV} from '../../../constants/env';
import {AdapterParseError} from '../adapterErrors';
import type {JamendoTrackResult, ApiSearchOptions} from '../../../types/api';

export type {JamendoTrackResult};

const JAMENDO_CONFIG = {
  baseUrl: 'https://api.jamendo.com/v3.0',
};

const clientId = (): string => ENV.JAMENDO_CLIENT_ID;

/**
 * The HTML entities Jamendo returns in its text fields.
 *
 * Jamendo escapes the characters that are not legal in its payload, so the
 * artist "Besson & Sa" arrives as "Besson&amp;sa" — and the app used to
 * draw the ESCAPED name on the row, in the search results and on the
 * music screens alike.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Decode the entities in a Jamendo text field.
 *
 * The decoder belongs to the ADAPTER: the wire shape is the adapter's
 * business, and nothing above it should ever see an entity. An unknown
 * entity is left alone — a name with a literal "&foo;" in it is more
 * likely than a typo in this table.
 */
export function decodeJamendoText(value: string): string {
  if (!value || value.indexOf('&') === -1) return value;
  return value.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match: string, entity: string) => {
      if (entity.charAt(0) === '#') {
        const hex = entity.charAt(1) === 'x' || entity.charAt(1) === 'X';
        const code = hex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        if (!Number.isFinite(code)) return match;
        try {
          return String.fromCodePoint(code);
    } catch {
          return match;
        }
      }
      const decoded = ENTITIES[entity.toLowerCase()];
      return decoded !== undefined ? decoded : match;
    },
  );
}

interface JamendoTrackRaw {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  duration: number;
  audio: string;
  image: string;
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
    name: decodeJamendoText(t.name),
    artistName: decodeJamendoText(t.artist_name ?? ''),
    albumName: decodeJamendoText(t.album_name ?? ''),
    duration: t.duration,
    audioUrl: t.audio,
    imageUrl: t.image ?? '',
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

/**
 * Jamendo paginates with `offset`, NOT with `page`.
 *
 * MEASURED on 2026-11-16 against the live API (limit 30):
 *
 *   search=love            → 30 rows
 *   search=love&page=2     → **0 rows**   (`page` is not a Jamendo
 *                                      parameter; with `search` it turns the
 *                                      request into one that answers with
 *                                      nothing at all)
 *   search=love&offset=30  → 30 rows, **0 shared** with page 1
 *
 *   tags=rock&order=popularity_total             → 30 rows
 *   tags=rock&order=popularity_total&page=2      → 30 rows, **30 shared**
 *                                                   with page 1 — the same
 *                                                   rows again
 *   tags=rock&order=popularity_total&offset=30   → 30 rows, **0 shared**
 *
 * So the two paths failed DIFFERENTLY, and both failed silently:
 *
 *   • the GENRE path sent `page=2`, Jamendo ignored it and answered with
 *     page 1's rows; the screen's dedupe-by-id threw them all away, so
 *     the list never grew, `hasNextPage` stayed true forever, the
 *     end-of-list footer never said "You're all caught up." and the
 *     filter button never got out of the way at the end of the list;
 *   • the SEARCH path sent `page=2` and Jamendo answered with NOTHING —
 *     four retried requests for a page that does not exist.
 *
 * The POPULAR path already sent `offset` and was the only branch that
 * paged correctly; it now shares this one rule with the other two.
 */
function jamendoPaging(
  page: number,
  limit: number,
): {limit: number; offset: number} {
  return {limit, offset: Math.max(0, (page - 1) * limit)};
}

export async function searchJamendoTracks(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<JamendoTrackResult[]> {
  const {limit, offset} = jamendoPaging(options?.page ?? 1, options?.limit ?? 10);
  return fetchTracksWithRetry(
    {
      search: query,
      limit,
      offset,
      // Jamendo honours `search` AND `tags` together (measured
      // 2026-11-16), so a browse screen can keep its genre filter applied
      // while the user searches. See `ApiSearchOptions.tags`.
      ...(options?.tags ? {tags: options.tags} : {}),
    },
    signal,
  );
}

export async function getJamendoTracksByGenre(
  genre: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<JamendoTrackResult[]> {
  const {limit, offset} = jamendoPaging(options?.page ?? 1, options?.limit ?? 10);
  return fetchTracksWithRetry(
    {
      tags: genre,
      limit,
      offset,
      order: 'popularity_total',
    },
    signal,
  );
}

/**
 * Jamendo answers intermittently with NOTHING.
 *
 * MEASURED on 2026-11-16 against the live API: the SAME url with the SAME
 * parameters returns 20 rows on one call and 0 rows on the next. Over 30
 * requests (3 passes x 10 genres) a fixed-order request came back empty
 * **10 times** — a third of all requests.
 *
 * An empty result is NOT an answer. It is a question the API declined to
 * answer, and TanStack Query will never retry it, because an empty array
 * is a SUCCESS to it — so the empty state is shown for a genre that has
 * thousands of tracks.
 *
 * The retry measured out as: 23 of 30 succeeded first time, 5 needed a
 * second attempt, 1 a third and 1 a fourth. **All 30 recovered within
 * three retries.**
 *
 * So the request is repeated, UNCHANGED, while it answers with nothing.
 * The parameters are never varied — see the note on `order` below.
 *
 * ## WAVE B16 — the retry is now BOUNDED, and the envelope says when
 *
 * The retry used to be UNCONDITIONAL: every empty page cost four
 * requests. That is right for a page the API declined to answer and
 * wrong for a page that legitimately has nothing — and the search path
 * measured exactly that: "four retried requests for a page that does not
 * exist" (see the paging note above).
 *
 * The envelope already carries the answer. `headers.results_count` is
 * the number of rows the query HAS, so:
 *
 *   • `results_count === 0` → the query has no rows at all. That is an
 *     ANSWER, not a refusal: one request, no retry.
 *   • the page's `offset` is at or past `results_count` → the page is
 *     past the end of the catalogue. Also an answer: one request, no
 *     retry.
 *   • otherwise the page is INSIDE the catalogue and came back empty →
 *     the API declined to answer it. Retry, unchanged, as before.
 *
 * The coverage the retry buys is unchanged — a flaky page inside the
 * catalogue still gets four attempts, and the measurement above is why
 * four is the number. What is gone is the four requests spent on a page
 * that was never going to have rows.
 */
const EMPTY_RETRY_ATTEMPTS = 4;

/**
 * Is this empty page a real answer rather than a refusal?
 *
 * `offset` is the page's offset into the catalogue and `resultsCount` is
 * what the envelope says the catalogue holds. A page at or past the end
 * of it has nothing to return, and asking again cannot change that.
 */
function emptyIsAnAnswer(
  offset: number,
  resultsCount: number | undefined,
): boolean {
  if (resultsCount === undefined) return false;
  if (resultsCount === 0) return true;
  return offset >= resultsCount;
}

/**
 * `order` selects a POOL, not a sort.
 *
 * MEASURED: `search=love` with no `order` and `search=love` with
 * `order=popularity_total` share **0 of 20** tracks. The same holds for
 * `tags=rock`. So varying `order` is not a retry — it returns different
 * tracks, and a list whose pages came from different pools would mix
 * them. The retry therefore repeats the request exactly as it was.
 */
async function fetchTracksWithRetry(
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<JamendoTrackResult[]> {
  let lastEmpty: JamendoTrackResult[] = [];

  // The page's offset into the catalogue — the envelope's count is
  // compared against it to tell a page that is past the end from a page
  // the API declined to answer.
  const offset =
    typeof params.offset === 'number' ? params.offset : 0;

  for (let attempt = 0; attempt < EMPTY_RETRY_ATTEMPTS; attempt++) {
    const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
      config: JAMENDO_CONFIG,
      path: '/tracks/',
      params: {
        client_id: clientId(),
        format: 'json',
        include: 'musicinfo',
        ...params,
      },
      signal,
    });
    const results = trackResultsFromResponseRaw(raw);
    if (results.length > 0) {
      return results;
    }
    // The envelope's own count says whether this empty is an answer.
    if (emptyIsAnAnswer(offset, raw?.headers?.results_count)) {
      return results;
    }
    lastEmpty = results;
  }

  return lastEmpty;
}

/**
 * The order fallback chain — the POPULAR stream's own rule.
 *
 * Jamendo's per-order availability is unreliable, so this path tries
 * several orders and remembers the first one that yields rows.
 *
 * It is the one place that varies `order`, because the popular stream has
 * no single pool to preserve: it is "whatever Jamendo says is popular
 * now". The genre and search paths keep their own pool and retry instead
 * (see `fetchTracksWithRetry`).
 */
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
  const paging = jamendoPaging(page, limit);
  for (const order of preferredOrder()) {
    const raw = await apiFetch<JamendoResponseRaw<JamendoTrackRaw>>({
      config: JAMENDO_CONFIG,
      path: '/tracks/',
      params: {
        client_id: clientId(),
        format: 'json',
        limit: paging.limit,
        offset: paging.offset,
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

