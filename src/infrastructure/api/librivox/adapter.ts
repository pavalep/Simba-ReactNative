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
import {apiFetch, ApiError} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {AudiobookResult, ApiSearchOptions} from '../../../types/api';

export type {AudiobookResult};

/**
 * One author on the wire.
 *
 * LibriVox splits the name: there is no `name` field, only a first and a
 * last name (measured 2026-11-18 against
 * `librivox.org/api/feed/audiobooks/?format=json`:
 * `{"id":"431","first_name":"Alexandre","last_name":"Dumas","dob":"1802","dod":"1870"}`).
 */
interface LibriVoxAuthorRaw {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  dob?: string;
  dod?: string;
}

interface LibriVoxBookRaw {
  id: number | string;
  title: string;
  description?: string;
  url_zip_file?: string;
  url_librivox?: string;
  url_iarchive?: string;
  totaltime?: string;
  language?: string;
  /**
   * The book's authors — an ARRAY of records, in both the list response
   * and the single-book response (measured 2026-11-18).
   */
  authors?: LibriVoxAuthorRaw[];
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
 * The book's author line.
 *
 * The adapter used to read `b.authors.name` — a property on an OBJECT,
 * where the wire carries an ARRAY of records and NO `name` field at all.
 * So EVERY book in the app was labelled "Unknown Author" — which is what
 * the device proof of the Audiobooks screen showed on 2026-11-18, ten rows
 * deep.
 *
 * The line is the first author's full name. A second author is added, and a
 * third makes it "et al." — which is how a catalogue says it.
 */
function authorLine(authors: LibriVoxAuthorRaw[] | undefined): string {
  const list = Array.isArray(authors) ? authors : [];
  const names = list
    .map(a => [a.first_name, a.last_name].filter(Boolean).join(' ').trim())
    .filter(Boolean);
  if (names.length === 0) return 'Unknown Author';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} & ${names[1]} et al.`;
}

/**
 * The Internet Archive item a book's audio files live in.
 *
 * MEASURED 2026-11-19 against the live feed: LibriVox sends
 * `url_iarchive` for NO books — twelve of twelve in one page had the
 * key ABSENT. It sends `url_zip_file`, and that URL carries the item's
 * identifier: `https://archive.org/compress/<identifier>/...`.
 *
 * So the identifier was on the wire all along and the adapter was
 * reading a field the API does not send. The consequence was that EVERY
 * audiobook page in the app showed "0 chapters" and no cover art,
 * because the chapter list and the cover are both derived from this
 * identifier (see `AudiobookDetailScreen`). The one book in the page
 * with no `url_zip_file` has no audio files at all, so an empty chapter
 * list is the honest answer for it.
 *
 * The app wants the canonical IA details URL, so the identifier is
 * normalised into that form and the IA adapter's `archiveIdentifierFromUrl`
 * keeps its one job.
 */
function archiveItemUrlForBook(b: Partial<LibriVoxBookRaw>): string {
  const direct = String(b.url_iarchive ?? '').trim();
  if (direct) return direct;
  const zip = String(b.url_zip_file ?? '').trim();
  // IA's two item-URL forms: /compress/<id>/ and /download/<id>/.
  const match = zip.match(/\/(?:compress|download)\/([^/?#]+)/);
  return match ? `https://archive.org/details/${match[1]}` : '';
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
  const authorName = authorLine(b.authors);
  return {
    id: Number(b.id) || 0,
    title: String(b.title),
    author: authorName,
    description: String(b.description ?? ''),
    urlZipFile: String(b.url_zip_file ?? ''),
    urlLibrivox: String(b.url_librivox ?? ''),
    urlIArchive: archiveItemUrlForBook(b),
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

// ─── The LibriVox feed's own contract ───────────────────────────────────
//
// Measured against the live API (2026-11-17), not read from a doc:
//
//  • The search fields are PREFIX matches, not free text. `?q=alice` is
//    IGNORED by the API — it answers 200 with the first books in the
//    catalogue, which is exactly what the app used to send, so the
//    Audiobooks search never searched. `?title=alice` is an EXACT match
//    and answers 404; `?title=^alice` is the prefix match and answers with
//    the Alice books. The `^` operator is LibriVox's own.
//  • `?subject=` is ignored the same way `?q=` is.
//  • `?page=3` is ignored — the feed pages with `?offset=`, and the offset
//    counts ITEMS, not pages. `?offset=3&limit=3` returns books 4..6.
//  • A 404 means "no books match", not "the server is broken".
//  • `?genre=` is 5xx-prone for some genres (`genre=^mystery` answers 500)
//    even with the prefix operator, which is why the genre path keeps a
//    full-text fallback.

/** LibriVox's prefix-match operator. */
const PREFIX = '^';

/** The offset a page starts at — LibriVox pages by ITEM count. */
function offsetForPage(page: number | undefined, limit: number): number {
  const p = typeof page === 'number' && page > 0 ? page : 1;
  return (p - 1) * limit;
}

/** A 404 from LibriVox is "no books match", not a failure. */
function isNoMatches(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404;
}

/**
 * One LibriVox query, with the 404 → empty-list rule applied.
 *
 * Every search in this file goes through here so the 404 rule has ONE
 * home. A 404 is the feed's way of saying "nothing matched"; treating it
 * as an error would turn every empty search into a failure state.
 */
async function librivoxSearch(
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  try {
    const raw = await apiFetch<LibriVoxResponseRaw>({
      config: API_CONFIG.librivox,
      path: '',
      params: {format: 'json', ...params},
      signal,
    });
    return audiobookResultsFromResponseRaw(raw);
  } catch (e) {
    if (isNoMatches(e)) return [];
    throw e;
  }
}

export async function searchAudiobooks(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<AudiobookResult[]> {
  const term = query.trim();
  if (!term) return [];
  const limit = options?.limit ?? 20;
  const offset = offsetForPage(options?.page, limit);

  // The field says "Search titles or authors…" and LibriVox cannot OR
  // across two fields in one request (it answers 500), so the title search
  // runs first and the author search only runs when the title search found
  // nothing. The author search therefore only costs a request when the
  // title search missed.
  const byTitle = await librivoxSearch(
    {title: PREFIX + term, limit, offset},
    signal,
  );
  if (byTitle.length > 0) return byTitle;
  return librivoxSearch({author: PREFIX + term, limit, offset}, signal);
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
  const name = authorName.trim();
  if (!name) return [];
  const limit = options?.limit ?? 20;
  return librivoxSearch(
    {author: PREFIX + name, limit, offset: offsetForPage(options?.page, limit)},
    signal,
  );
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
  const tag = genre.trim().toLowerCase();
  if (!tag) return [];
  const limit = options?.limit ?? 20;
  try {
    const books = await librivoxSearch(
      {genre: PREFIX + tag, limit, offset: offsetForPage(options?.page, limit)},
      signal,
    );
    if (books.length > 0) return books;
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
  const limit = options?.limit ?? 30;
  return librivoxSearch(
    {limit, offset: offsetForPage(options?.page, limit)},
    signal,
  );
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const LIBRIVOX_RETRIES = 2;
