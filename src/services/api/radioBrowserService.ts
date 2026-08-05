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

/** Genre tags ordered by station count (radio-browser /json/genres). */
export async function getGenres(
  limit = 40,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<Array<{name: string; stationcount: number}>>({
    config: API_CONFIG.radioBrowser,
    path: '/json/genres',
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
