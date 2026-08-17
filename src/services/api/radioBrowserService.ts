// ─── Radio Browser API Service ──────────────────────────────────────────
// Docs: https://api.radio-browser.info/

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {RadioStationResult, ApiSearchOptions} from '../../types/api';

// ─── Cache TTLs (ms) ────────────────────────────────────────────────────

const CACHE = {
  search: 10 * 60 * 1000,
  top: 30 * 60 * 1000,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────

function buildParams(options?: ApiSearchOptions): Record<string, string | number | undefined> {
  const limit = options?.limit ?? 30;
  return {
    limit,
    // Radio-Browser paginates via `offset`; derive it from 1-based `page`.
    offset: options?.page && options.page > 1 ? (options.page - 1) * limit : 0,
  };
}

// ─── Exported functions ─────────────────────────────────────────────────

export async function searchStations(
  query: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params: {name: query, ...buildParams(options)},
    cacheTtlMs: CACHE.search,
  });
}

export async function getStationsByCountry(
  country: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bycountry/${encodeURIComponent(country)}`,
    params: buildParams(options),
    cacheTtlMs: CACHE.search,
  });
}

export async function getStationsByGenre(
  genre: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bytag/${encodeURIComponent(genre)}`,
    params: buildParams(options),
    cacheTtlMs: CACHE.search,
  });
}

export async function getStationsByLanguage(
  language: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bylanguage/${encodeURIComponent(language)}`,
    params: buildParams(options),
    cacheTtlMs: CACHE.search,
  });
}

/**
 * Combined-filter browse (v10.1 Wave 7 standalone Radio): one or more of
 * genre / country / language applied simultaneously via the search
 * endpoint's `tag`/`country`/`language` params. Empty filters are simply
 * omitted, so a call with no filters at all behaves like top stations.
 * Results are ordered by click count so the list reads as "top stations
 * matching these filters".
 */
export interface RadioFilterSet {
  genre?: string;
  country?: string;
  language?: string;
}

export async function getStationsByFilters(
  filters: RadioFilterSet,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const params: Record<string, string | number | undefined> = {
    ...buildParams(options),
    order: 'clickcount',
    reverse: 'true',
    hidebroken: 'true',
  };
  if (filters.genre) params.tag = filters.genre;
  if (filters.country) params.country = filters.country;
  if (filters.language) params.language = filters.language;
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params,
    cacheTtlMs: CACHE.search,
  });
}

export async function getTopStations(
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/topclick',
    params: buildParams(options),
    cacheTtlMs: CACHE.top,
  });
}

export async function getStationById(
  uuid: string,
): Promise<RadioStationResult | null> {
  const stations = await apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/${encodeURIComponent(uuid)}`,
  });
  return stations.length > 0 ? stations[0] : null;
}

// ─── Browse metadata (P36.1: by-genre / by-country / by-language) ───

export interface RadioBrowseTag {
  name: string;
  stationCount: number;
}

/**
 * Genre tags ordered by station count.
 *
 * P52: Radio-Browser's `/json/genres` endpoint was deprecated and now
 * returns 404. The replacement is `/json/tags?type=genre` — same
 * response shape (`{name, stationcount}`), but a longer list and
 * broader. We request the top entries by `order=stationcount&reverse=true`
 * so the consumer's `.slice(0, limit)` returns the most popular tags
 * first.
 */
export async function getGenres(
  limit = 40,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<Array<{name: string; stationcount: number}>>({
    config: API_CONFIG.radioBrowser,
    path: '/json/tags',
    params: {
      type: 'genre',
      hidebroken: 'true',
      order: 'stationcount',
      reverse: 'true',
      limit: Math.max(limit * 2, 80), // server returns up to this many
    },
    cacheTtlMs: CACHE.top,
  });
  return raw
    .filter(g => g.name)
    .slice(0, limit)
    .map(g => ({name: g.name, stationCount: g.stationcount ?? 0}));
}

/** Countries with the most stations (radio-browser /json/countries). */
export async function getCountries(
  limit = 30,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<Array<{name: string; stationcount: number}>>({
    config: API_CONFIG.radioBrowser,
    path: '/json/countries',
    cacheTtlMs: CACHE.top,
  });
  return raw
    .filter(c => c.name)
    .slice(0, limit)
    .map(c => ({name: c.name, stationCount: c.stationcount ?? 0}));
}

/** Languages with the most stations (radio-browser /json/languages). */
export async function getLanguages(
  limit = 30,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<Array<{name: string; stationcount: number}>>({
    config: API_CONFIG.radioBrowser,
    path: '/json/languages',
    cacheTtlMs: CACHE.top,
  });
  return raw
    .filter(l => l.name)
    .slice(0, limit)
    .map(l => ({name: l.name, stationCount: l.stationcount ?? 0}));
}
