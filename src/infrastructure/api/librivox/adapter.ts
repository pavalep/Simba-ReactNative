/**
 * V18 + V21 W6 P21c — librivoxAdapter
 *
 * Replaces `librivoxService.ts`. The LibriVox JSON feed returns
 * `books` as either a single object, a dict with numeric keys, or
 * undefined. The `normalizeBooks` helper flattens all three cases
 * into a uniform array; the convertor is pure.
 *
 * `searchByAuthor` has no live consumers in the codebase (only
 * re-exported from `services/api/index.ts`). Kept for API parity;
 * delete on a follow-up.
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `audiobookResultFromRaw` validates per-book shape and throws
 * `AdapterParseError` for malformed records (was silent `null`
 * skip pre-W22). All 5 service functions accept
 * `signal?: AbortSignal` so TanStack Query can cancel stale
 * requests on screen unmount / query-key change.
 *
 * The Jamendo / Audius / Internet Archive / IPTV adapters are
 * the proof-of-pattern references for the W6 P21c shape; this
 * file follows the same pattern.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {AudiobookResult, ApiSearchOptions} from '../../../types/api';

export type {AudiobookResult};

interface LibriVoxBookRaw {
  id: number | string;
  title: string;
  description?: string;
  url_zip_file?: string;
  url_librivox?: string;
  url_iarchive?: string;
  totaltime?: string;
  language?: string;
  authors?: {name?: string};
}

interface LibriVoxResponseRaw {
  books?: Record<string, unknown> | LibriVoxBookRaw;
}

/** "HH:MM:SS" or "MM:SS" → total seconds. */
function parseTotalTime(totaltime: string | undefined): number {
  if (!totaltime) return 0;
  const parts = totaltime.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * Normalize the `books` field into an array. LibriVox returns it as
 * a single object, a dict with numeric keys, or undefined.
 *
 * V21 W6 P21c: typed `unknown` input; returns `[]` for
 * non-object / unrecognized shapes (graceful — the API rarely
 * returns garbage, and `[]` is the legitimate "no books"
 * signal).
 */
function normalizeBooks(books: unknown): LibriVoxBookRaw[] {
  if (books === undefined || books === null) return [];
  if (typeof books !== 'object') return [];
  // Single object (has `id` field) → wrap in array.
  if ('id' in books) {
    return [books as LibriVoxBookRaw];
  }
  // Dict with numeric keys → unwrap.
  const dict = books as Record<string, unknown>;
  const keys = Object.keys(dict);
  if (keys.length === 0) return [];
  if (keys.some(k => /^\d+$/.test(k))) {
    return keys.map(k => dict[k] as LibriVoxBookRaw);
  }
  // Unrecognized shape — graceful empty.
  return [];
}

/**
 * V21 W6 P21c — per-book shape validation.
 * Throws `AdapterParseError` for malformed records (was silent
 * `null` skip pre-W22). Required fields: `id` is number or
 * string, `title` is string.
 */
function parseRawAudiobook(raw: unknown, path: string): AudiobookResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'librivox',
      path,
      'expected book object',
    );
  }
  const b = raw as Partial<LibriVoxBookRaw>;
  if (typeof b.title !== 'string') {
    throw new AdapterParseError(
      'librivox',
      `${path}.title`,
      'expected string',
    );
  }
  if (typeof b.id !== 'number' && typeof b.id !== 'string') {
    throw new AdapterParseError(
      'librivox',
      `${path}.id`,
      `expected number or string, got ${typeof b.id}`,
    );
  }
  const authorName =
    typeof b.authors?.name === 'string' ? b.authors.name : 'Unknown Author';
  return {
    id: Number(b.id) || 0,
    title: String(b.title),
    author: authorName,
    description: String(b.description ?? ''),
    urlZipFile: String(b.url_zip_file ?? ''),
    urlLibrivox: String(b.url_librivox ?? ''),
    urlIArchive: String(b.url_iarchive ?? ''),
    totalTime: parseTotalTime(b.totaltime),
    language: String(b.language ?? ''),
  };
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 * Pre-W22 returned `null` for malformed / undefined input and
 * the caller filtered it out. Now throws `AdapterParseError`.
 */
export function audiobookResultFromRaw(
  raw: unknown,
  path: string = 'book',
): AudiobookResult {
  return parseRawAudiobook(raw, path);
}

export function audiobookResultsFromResponseRaw(
  raw: unknown,
): AudiobookResult[] {
  const books = normalizeBooks(raw === null || raw === undefined ? undefined : (raw as LibriVoxResponseRaw).books);
  return books.map((b, i) => parseRawAudiobook(b, `books[${i}]`));
}

export async function searchAudiobooks(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      q: query,
      format: 'json',
      limit: options?.limit ?? 20,
      page: options?.page ?? 1,
    },
    signal,
  });
  return audiobookResultsFromResponseRaw(raw);
}

export async function getAudiobookById(
  id: number,
  signal?: AbortSignal,
): Promise<AudiobookResult | null> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {id, format: 'json'},
    signal,
  });
  const books = normalizeBooks(
    raw === null || raw === undefined ? undefined : (raw as LibriVoxResponseRaw).books,
  );
  return books.length > 0
    ? parseRawAudiobook(books[0], 'books[0]')
    : null;
}

export async function searchByAuthor(
  authorName: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      author: authorName,
      format: 'json',
      limit: options?.limit ?? 20,
      page: options?.page ?? 1,
    },
    signal,
  });
  return audiobookResultsFromResponseRaw(raw);
}

/**
 * The `?genre=` filter is fragile on LibriVox (case-sensitive,
 * 5xx-prone, multi-word issues). Attempt the filter first; on 5xx
 * or empty result, fall back to full-text search. The full-text
 * search is reliable and returns books whose title/description
 * contains the genre name.
 *
 * V21 W6 P21c: transport-level failures (`ApiError` + signal
 * aborts) are still swallowed so the caller falls back to the
 * full-text path; wire-shape failures (`AdapterParseError`)
 * propagate so the hook layer / caller can distinguish "server
 * is down" from "server returned garbage".
 */
export async function searchByGenre(
  genre: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  try {
    const raw = await apiFetch<LibriVoxResponseRaw>({
      config: API_CONFIG.librivox,
      path: '',
      params: {
        genre: genre.toLowerCase().trim(),
        format: 'json',
        limit: options?.limit ?? 20,
        page: options?.page ?? 1,
      },
      signal,
    });
    const books = normalizeBooks(
      raw === null || raw === undefined ? undefined : (raw as LibriVoxResponseRaw).books,
    );
    if (books.length > 0) {
      return books.map((b, i) => parseRawAudiobook(b, `books[${i}]`));
    }
  } catch (e) {
    // Transport-level failures → fall through to full-text.
    // Wire-shape failures propagate.
    if (e instanceof AdapterParseError) throw e;
  }
  return searchAudiobooks(genre, options, signal);
}

export async function getRecentAudiobooks(
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      format: 'json',
      limit: options?.limit ?? 30,
      page: options?.page ?? 1,
    },
    signal,
  });
  return audiobookResultsFromResponseRaw(raw);
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const LIBRIVOX_RETRIES = 2;
