/**
 * V18 + V21 W6 P21c — radioBrowserAdapter
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
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `stationFromRaw` and `browseTagFromRaw` validate per-record shape
 * and throw `AdapterParseError` for malformed records (was silent
 * `null` skip pre-W22). All 9 service functions accept
 * `signal?: AbortSignal` so TanStack Query can cancel stale
 * requests on screen unmount / query-key change.
 *
 * The Jamendo / Audius / Internet Archive / IPTV / LibriVox /
 * MusicBrainz adapters are the proof-of-pattern references for
 * the W6 P21c shape; this file follows the same pattern.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {RadioStationResult, ApiSearchOptions} from '../../../types/api';

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

/**
 * V21 W6 P21c — per-tag shape validation.
 */
function parseRawBrowseTag(
  raw: unknown,
  path: string,
): RadioBrowseTag {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'radioBrowser',
      path,
      'expected tag object',
    );
  }
  const t = raw as Partial<RadioBrowseTagRaw>;
  if (typeof t.name !== 'string' || t.name.length === 0) {
    throw new AdapterParseError(
      'radioBrowser',
      `${path}.name`,
      'expected non-empty string',
    );
  }
  return {name: t.name, stationCount: t.stationcount ?? 0};
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 * Pre-W22 returned `null` for malformed / undefined input.
 * Now throws `AdapterParseError`.
 */
export function browseTagFromRaw(
  raw: unknown,
  path: string = 'tag',
): RadioBrowseTag {
  return parseRawBrowseTag(raw, path);
}

export function browseTagsFromRaw(raw: unknown): RadioBrowseTag[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'radioBrowser',
      'envelope',
      'expected array of tags',
    );
  }
  return raw.map((t, i) => parseRawBrowseTag(t, `tags[${i}]`));
}

/**
 * V21 W6 P21c — per-station shape validation.
 */
function parseRawStation(
  raw: unknown,
  path: string,
): RadioStationResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'radioBrowser',
      path,
      'expected station object',
    );
  }
  const s = raw as Partial<RadioStationResultRaw>;
  if (typeof s.stationuuid !== 'string' || s.stationuuid.length === 0) {
    throw new AdapterParseError(
      'radioBrowser',
      `${path}.stationuuid`,
      'expected non-empty string id',
    );
  }
  if (typeof s.name !== 'string' || s.name.length === 0) {
    throw new AdapterParseError(
      'radioBrowser',
      `${path}.name`,
      'expected non-empty string',
    );
  }
  return {
    id: s.stationuuid,
    name: s.name,
    url: s.url_resolved || s.url || '',
    image: s.favicon || '',
    tags: s.tags || '',
    country: s.country || '',
    language: s.language || '',
    codec: s.codec || '',
    bitrate: s.bitrate ?? 0,
    clickCount: s.clickcount ?? 0,
  };
}

/**
 * Wire → domain convertor. The radio-browser API returns
 *   `stationuuid` (the per-station UUID),
 *   `favicon` (the small station logo),
 *   `url_resolved` (the actually-playable URL after redirects).
 * The domain type carries them as `id` / `image` / `url` so the
 * screen layer never sees the wire keys. The `url` is resolved
 * to the playable one (falling back to the user-submitted URL).
 *
 * V21 W6 P21c: typed `unknown` + `path`; throws
 * `AdapterParseError` on malformed records.
 */
export function stationFromRaw(
  raw: unknown,
  path: string = 'station',
): RadioStationResult {
  return parseRawStation(raw, path);
}

export function stationsFromRaw(raw: unknown): RadioStationResult[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'radioBrowser',
      'envelope',
      'expected array of stations',
    );
  }
  return raw.map((s, i) => parseRawStation(s, `stations[${i}]`));
}

export async function searchStations(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/search',
    params: {name: query, ...buildParams(options)},
    signal,
  });
  return stationsFromRaw(raw);
}

export async function getStationsByCountry(
  country: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bycountry/${encodeURIComponent(country)}`,
    params: buildParams(options),
    signal,
  });
  return stationsFromRaw(raw);
}

export async function getStationsByGenre(
  genre: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bytag/${encodeURIComponent(genre)}`,
    params: buildParams(options),
    signal,
  });
  return stationsFromRaw(raw);
}

export async function getStationsByLanguage(
  language: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/bylanguage/${encodeURIComponent(language)}`,
    params: buildParams(options),
    signal,
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
  signal?: AbortSignal,
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
    signal,
  });
  return stationsFromRaw(raw);
}

export async function getTopStations(
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<RadioStationResult[]> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/stations/topclick',
    params: buildParams(options),
    signal,
  });
  return stationsFromRaw(raw);
}

export async function getStationById(
  uuid: string,
  signal?: AbortSignal,
): Promise<RadioStationResult | null> {
  const raw = await apiFetch<RadioStationResultRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: `/json/stations/${encodeURIComponent(uuid)}`,
    signal,
  });
  // V21 W6 P21c: `stationsFromRaw` already validates each
  // station and returns the typed `RadioStationResult[]`. No
  // need to re-parse.
  return stationsFromRaw(raw)[0] ?? null;
}

export async function getGenres(
  limit = 40,
  signal?: AbortSignal,
): Promise<RadioBrowseTag[]> {
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
    signal,
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}

export async function getCountries(
  limit = 30,
  signal?: AbortSignal,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/countries',
    signal,
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}

export async function getLanguages(
  limit = 30,
  signal?: AbortSignal,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/languages',
    signal,
  });
  return browseTagsFromRaw(raw).slice(0, limit);
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const RADIO_BROWSER_RETRIES = 2;
