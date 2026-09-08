/**
 * V18 — radioBrowserAdapter
 *
 * V20.11a — completed the *Raw / *FromRaw pattern. The pre-V20.11
 * adapter was missing `stationFromRaw`; the wire shape (with
 * `stationuuid`, `favicon`, `url_resolved`) leaked into the
 * domain type and the screen layer had to rename those fields
 * back to `id` / `image` / `url` in a `toRow` function. The
 * adapter now does the rename once, in the convertor, and
 * the public service functions return the domain shape.
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

/**
 * Wire shape from radio-browser.info. The API returns these
 * snake_case / lowercase keys; the `*Result` domain type
 * normalizes them to camelCase UI-friendly names.
 */
interface RadioStationResultRaw {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  language?: string;
  codec?: string;
  bitrate?: number;
  clickcount?: number;
}

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

/**
 * Wire → domain convertor. The radio-browser API returns
 *   `stationuuid` (the per-station UUID),
 *   `favicon` (the small station logo),
 *   `url_resolved` (the actually-playable URL after redirects).
 * The domain type carries them as `id` / `image` / `url` so the
 * screen layer never sees the wire keys. The `url` is resolved
 * to the playable one (falling back to the user-submitted URL).
 */
export function stationFromRaw(
  raw: RadioStationResultRaw | undefined,
): RadioStationResult | null {
  if (!raw || !raw.stationuuid || !raw.name) return null;
  return {
    id: raw.stationuuid,
    name: raw.name,
    url: raw.url_resolved || raw.url || '',
    image: raw.favicon || '',
    tags: raw.tags || '',
    country: raw.country || '',
    language: raw.language || '',
    codec: raw.codec || '',
    bitrate: raw.bitrate ?? 0,
    clickCount: raw.clickcount ?? 0,
  };
}

export function stationsFromRaw(
  raw: RadioStationResultRaw[] | undefined,
): RadioStationResult[] {
  return (raw ?? [])
    .map(stationFromRaw)
    .filter((s): s is RadioStationResult => s !== null);
}

export async function searchStations(
  query: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params: {name: query, ...buildParams(options)},
  });
  return stationsFromRaw(raw);
}

export async function getStationsByCountry(
  country: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bycountry/${encodeURIComponent(country)}`,
    params: buildParams(options),
  });
  return stationsFromRaw(raw);
}

export async function getStationsByGenre(
  genre: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bytag/${encodeURIComponent(genre)}`,
    params: buildParams(options),
  });
  return stationsFromRaw(raw);
}

export async function getStationsByLanguage(
  language: string,
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bylanguage/${encodeURIComponent(language)}`,
    params: buildParams(options),
  });
  return stationsFromRaw(raw);
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
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params,
  });
  return stationsFromRaw(raw);
}

export async function getTopStations(
  options?: ApiSearchOptions,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/topclick',
    params: buildParams(options),
  });
  return stationsFromRaw(raw);
}

export async function getStationById(
  uuid: string,
): Promise<RadioStationResult | null> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/${encodeURIComponent(uuid)}`,
  });
  return stationsFromRaw(raw)[0] ?? null;
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
