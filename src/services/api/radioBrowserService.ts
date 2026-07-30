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
  return {
    limit: options?.limit ?? 30,
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
