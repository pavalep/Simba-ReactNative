/**
 * V18 — librivoxAdapter
 *
 * Replaces `librivoxService.ts`. The LibriVox JSON feed returns
 * `books` as either a single object, a dict with numeric keys, or
 * undefined. The `normalizeBooks` helper flattens all three cases
 * into a uniform array; the convertor is pure.
 *
 * `searchByAuthor` has no live consumers in the codebase (only
 * re-exported from `services/api/index.ts`). Kept for API parity;
 * delete on a follow-up.
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {AudiobookResult, ApiSearchOptions} from '../../types/api';

export type {AudiobookResult};

const SEARCH_CACHE_TTL = 600_000; // 10 min
const DETAIL_CACHE_TTL = 3_600_000; // 1 hour

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
 */
function normalizeBooks(
  books: Record<string, unknown> | LibriVoxBookRaw | undefined,
): LibriVoxBookRaw[] {
  if (!books) return [];
  if (!('id' in books) && typeof books === 'object') {
    const keys = Object.keys(books);
    if (keys.length === 0) return [];
    if (keys.some(k => /^\d+$/.test(k))) {
      return keys.map(k => books[k] as LibriVoxBookRaw);
    }
  }
  return [books as LibriVoxBookRaw];
}

export function audiobookResultFromRaw(
  raw: LibriVoxBookRaw | undefined,
): AudiobookResult | null {
  if (!raw) return null;
  const authorName =
    typeof raw.authors?.name === 'string' ? raw.authors.name : 'Unknown Author';
  return {
    id: Number(raw.id) || 0,
    title: String(raw.title || ''),
    author: authorName,
    description: String(raw.description || ''),
    urlZipFile: String(raw.url_zip_file || ''),
    urlLibrivox: String(raw.url_librivox || ''),
    urlIArchive: String(raw.url_iarchive || ''),
    totalTime: parseTotalTime(raw.totaltime),
    language: String(raw.language || ''),
  };
}

export function audiobookResultsFromResponseRaw(
  raw: LibriVoxResponseRaw | undefined,
): AudiobookResult[] {
  return normalizeBooks(raw?.books)
    .map(audiobookResultFromRaw)
    .filter((b): b is AudiobookResult => b !== null);
}

export async function searchAudiobooks(
  query: string,
  options?: ApiSearchOptions,
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
  });
  return audiobookResultsFromResponseRaw(raw);
}

export async function getAudiobookById(
  id: number,
): Promise<AudiobookResult | null> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {id, format: 'json'},
  });
  const books = normalizeBooks(raw?.books);
  return books.length > 0 ? audiobookResultFromRaw(books[0]) : null;
}

export async function searchByAuthor(
  authorName: string,
  options?: ApiSearchOptions,
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
  });
  return audiobookResultsFromResponseRaw(raw);
}

/**
 * The `?genre=` filter is fragile on LibriVox (case-sensitive,
 * 5xx-prone, multi-word issues). Attempt the filter first; on 5xx
 * or empty result, fall back to full-text search. The full-text
 * search is reliable and returns books whose title/description
 * contains the genre name.
 */
export async function searchByGenre(
  genre: string,
  options?: ApiSearchOptions,
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
    });
    const books = normalizeBooks(raw?.books);
    if (books.length > 0) return books.map(audiobookResultFromRaw).filter(Boolean) as AudiobookResult[];
  } catch {
    // fall through to full-text
  }
  return searchAudiobooks(genre, options);
}

export async function getRecentAudiobooks(
  options?: ApiSearchOptions,
): Promise<AudiobookResult[]> {
  const raw = await apiFetch<LibriVoxResponseRaw>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      format: 'json',
      limit: options?.limit ?? 30,
      page: options?.page ?? 1,
    },
  });
  return audiobookResultsFromResponseRaw(raw);
}
