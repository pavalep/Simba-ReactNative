// ─── LibriVox API Service ──────────────────────────────────────────────
// Uses JSON format (format=json). Handles the unusual nested-object
// response format where `books` may be a single object or an object
// with numeric keys.

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {ApiSearchOptions, AudiobookResult} from '../../types/api';

// ─── Constants ─────────────────────────────────────────────────────────

const SEARCH_CACHE_TTL = 600_000; // 10 min
const DETAIL_CACHE_TTL = 3_600_000; // 1 hour

// ─── Helpers ───────────────────────────────────────────────────────────

/** Parse a "HH:MM:SS" or "MM:SS" string to total seconds. */
function parseTotalTime(totaltime: string | undefined): number {
  if (!totaltime) {return 0;}
  const parts = totaltime.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Normalize the LibriVox `books` field which can be:
 *   - A single book object `{id: 1, ...}`
 *   - An object with numeric keys `{"1": {...}, "2": {...}}`
 *   - `undefined` (no results)
 */
function normalizeBooks(
  books: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  if (!books) {return [];}
  const keys = Object.keys(books);
  if (keys.length === 0) {return [];}

  // If keys are numeric (string numbers), it's a dict of books
  if (keys.some(k => /^\d+$/.test(k))) {
    return keys.map(k => books[k] as Record<string, unknown>);
  }

  // Otherwise it's a single book object
  return [books as Record<string, unknown>];
}

/** Map a raw LibriVox book object to AudiobookResult. */
function mapBook(book: Record<string, unknown>): AudiobookResult {
  const authors = book.authors as Record<string, unknown> | undefined;
  const authorName =
    authors && typeof authors.name === 'string'
      ? authors.name
      : 'Unknown Author';

  return {
    id: Number(book.id) || 0,
    title: String(book.title || ''),
    author: authorName,
    description: String(book.description || ''),
    urlZipFile: String(book.url_zip_file || ''),
    urlLibrivox: String(book.url_librivox || ''),
    urlIArchive: String(book.url_iarchive || ''),
    totalTime: parseTotalTime(book.totaltime as string | undefined),
    language: String(book.language || ''),
  };
}

// ─── Response Types ────────────────────────────────────────────────────

interface LibriVoxResponse {
  books?: Record<string, unknown>;
}

// ─── Exported Functions ────────────────────────────────────────────────

/**
 * Search audiobooks by query string.
 */
export async function searchAudiobooks(
  query: string,
  options?: ApiSearchOptions,
): Promise<AudiobookResult[]> {
  const limit = options?.limit ?? 20;
  const data = await apiFetch<LibriVoxResponse>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      q: query,
      format: 'json',
      limit,
    },
    cacheTtlMs: SEARCH_CACHE_TTL,
  });

  const books = normalizeBooks(data.books);
  return books.map(mapBook);
}

/**
 * Get a single audiobook by its ID.
 */
export async function getAudiobookById(
  id: number,
): Promise<AudiobookResult | null> {
  const data = await apiFetch<LibriVoxResponse>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      id,
      format: 'json',
    },
    cacheTtlMs: DETAIL_CACHE_TTL,
  });

  const books = normalizeBooks(data.books);
  return books.length > 0 ? mapBook(books[0]) : null;
}

/**
 * Search audiobooks by author name.
 */
export async function searchByAuthor(
  authorName: string,
  options?: ApiSearchOptions,
): Promise<AudiobookResult[]> {
  const limit = options?.limit ?? 20;
  const data = await apiFetch<LibriVoxResponse>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      author: authorName,
      format: 'json',
      limit,
    },
    cacheTtlMs: SEARCH_CACHE_TTL,
  });

  const books = normalizeBooks(data.books);
  return books.map(mapBook);
}

/**
 * Search audiobooks by genre (P37.1 — LibriVox genre browse).
 */
export async function searchByGenre(
  genre: string,
  options?: ApiSearchOptions,
): Promise<AudiobookResult[]> {
  const limit = options?.limit ?? 20;
  const data = await apiFetch<LibriVoxResponse>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      genre,
      format: 'json',
      limit,
    },
    cacheTtlMs: SEARCH_CACHE_TTL,
  });

  const books = normalizeBooks(data.books);
  return books.map(mapBook);
}

/**
 * Most recently added books (empty query returns the latest uploads).
 */
export async function getRecentAudiobooks(
  options?: ApiSearchOptions,
): Promise<AudiobookResult[]> {
  const limit = options?.limit ?? 30;
  const data = await apiFetch<LibriVoxResponse>({
    config: API_CONFIG.librivox,
    path: '',
    params: {
      format: 'json',
      limit,
    },
    cacheTtlMs: SEARCH_CACHE_TTL,
  });

  const books = normalizeBooks(data.books);
  return books.map(mapBook);
}
