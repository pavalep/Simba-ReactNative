/**
 * V18 — radioBrowserAdapter
 *
 * Replaces `radioBrowserService.ts`. Radio-Browser returns stations
 * as an array whose wire shape IS the domain shape — the
 * `RadioStationResult` type is field-for-field compatible. The
 * only convertor needed is for the metadata endpoints (genres,
 * countries, languages) where the wire uses `stationcount` (one
 * word) and the domain uses `stationCount` (camelCase).
 *
 * Pagination: the API uses `limit` + `offset`. The client derives
 * `hasNextPage` by checking whether the response was a full page
 * (`items.length === limit`); the consumer's useInfiniteApiQuery
 * can use this via the `getNextPageParam` callback.
 *
 * Type contract (see SPEC §2):
 *   *Raw DTOs are file-local. *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {RadioStationResult, ApiSearchOptions} from '../../types/api';

export type {RadioStationResult};

const CACHE = {
  search: 10 * 60 * 1000,
  top: 30 * 60 * 1000,
} as const;

function buildParams(options?: ApiSearchOptions): Record<string, string | number | undefined> {
  const limit = options?.limit ?? 30;
  return {
    limit,
    offset: options?.page && options.page > 1 ? (options.page - 1) * limit : 0,
  };
}

interface RadioBrowseTagRaw {
  name: string;
  stationcount?: number;
}

export interface RadioBrowseTag {
  name: string;
  stationCount: number;
}

export function browseTagFromRaw(raw: RadioBrowseTagRaw | undefined): RadioBrowseTag | null {
  if (!raw || !raw.name) return null;
  return {name: raw.name, stationCount: raw.stationcount ?? 0};
}

export function browseTagsFromRaw(raw: RadioBrowseTagRaw[] | undefined): RadioBrowseTag[] {
  return (raw ?? [])
    .map(browseTagFromRaw)
    .filter((t): t is RadioBrowseTag => t !== null);
}

export async function searchStations(
  query: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params: {name: query, ...buildParams(options)},
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
  });
}

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
  });
}

export async function getTopStations(
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  return apiFetch<RadioStationResult[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/topclick',
    params: buildParams(options),
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

export async function getGenres(limit = 40): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/tags',
    params: {
      type: 'genre',
      hidebroken: 'true',
      order: 'stationcount',
      reverse: 'true',
      limit: Math.max(limit * 2, 80),
    },
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}

export async function getCountries(limit = 30): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/countries',
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}

export async function getLanguages(limit = 30): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/languages',
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}
