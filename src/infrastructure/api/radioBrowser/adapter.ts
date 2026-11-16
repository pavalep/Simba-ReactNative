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
 * The MENU path — the tags that can be DRAWN as a chip.
 *
 * MEASURED on 2026-11-16 against the live API: `/json/countries` answers
 * with **225 records, and 2 of them have an EMPTY `name`** — the ISO codes
 * `UN` and `ZZ`, which are the stations that report an unknown country.
 * The strict parser rejects an empty name, and `browseTagsFromRaw` maps
 * over the WHOLE batch — so ONE unusable record voided all 223 good
 * countries.
 *
 * The Radio screen's COUNTRY group then rendered its HEADER with no chips
 * under it at all, with no error, no spinner and no retry — proven on
 * device on 2026-11-16, and the reason the third group of the sheet was
 * silently empty while the other two were full.
 *
 * An unnamed country cannot be drawn AND cannot be selected: the filter's
 * key would be the empty string, which the hook reads as "no filter"
 * (`key || null`). So the record is not information the user could have
 * used — it is a dead row in a menu, and dropping it loses nothing.
 *
 * The strict convertor stays strict (`browseTagsFromRaw`): the contract
 * test pins it, and a caller that asks for ONE tag still wants to hear
 * about a malformed one. The MENU path is the one place where a bulk list
 * must survive a bulk list's bad rows.
 */
export function drawableBrowseTagsFromRaw(raw: unknown): RadioBrowseTag[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'radioBrowser',
      'envelope',
      'expected array of tags',
    );
  }
  const drawable: RadioBrowseTag[] = [];
  for (const t of raw) {
    try {
      drawable.push(parseRawBrowseTag(t, 'tag'));
    } catch (e) {
      // Only a shape failure is dropped — a transport or programming
      // error must still travel up.
      if (e instanceof AdapterParseError) continue;
      throw e;
    }
  }
  return drawable;
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

/**
 * The GENRE menu.
 *
 * MEASURED on 2026-11-16: radio-browser's `/json/tags` **ignores its
 * `type` parameter**. Five requests — no `type` at all, `type=genre`,
 * `type=country`, `type=language`, `type=tag` — returned the IDENTICAL 80
 * records, with the identical name sequence. So `type: 'genre'` below is
 * not a filter that works; it is a request the API does not answer.
 *
 * The param is still sent, because it is the documented way to ask and a
 * future radio-browser may honour it. What the group actually contains is
 * the full tag list ordered by station count — whose top 40 are the
 * genres a listener means by "genre" (pop, music, news, rock, talk,
 * dance, hits, oldies, 80s, classical, jazz).
 */
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
  return drawableBrowseTagsFromRaw(raw).slice(0, limit);
}

/**
 * The COUNTRY menu.
 *
 * MEASURED on 2026-11-16: `/json/countries` answers with 225 records, and
 * **2 of them have an empty `name`** (the ISO codes `UN` and `ZZ`) — which
 * the strict parser rejects, voiding the whole batch. See
 * `drawableBrowseTagsFromRaw`.
 *
 * The order matters too: without it the API answers in an arbitrary order
 * (Andorra with 5 stations first). With `order=stationcount&reverse=true`
 * the list opens with The United States Of America (7000), Germany (5604),
 * France (2801) — the countries a listener actually looks for, and the
 * order the menu is read in.
 */
export async function getCountries(
  limit = 30,
  signal?: AbortSignal,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/countries',
    params: {
      order: 'stationcount',
      reverse: 'true',
    },
    signal,
  });
  return drawableBrowseTagsFromRaw(raw).slice(0, limit);
}

/**
 * The LANGUAGE menu.
 *
 * MEASURED on 2026-11-16: `/json/languages` answers with 586 records, and
 * in its own order the first ones are `1`, `111`, `123`, `128 brazilian
 * portuguese`, `17 addtional languages` — stations that report a numeric
 * language code. A menu that opens with "1" and "111" is a menu nobody
 * reads.
 *
 * With `order=stationcount&reverse=true` the same 586 records open with
 * english (11334), german (3979), spanish (3881), french (2486),
 * chinese (2029), russian (1408) — and the numeric leftovers sink to the
 * bottom, out of the first screen.
 */
export async function getLanguages(
  limit = 30,
  signal?: AbortSignal,
): Promise<RadioBrowseTag[]> {
  const raw = await apiFetch<RadioBrowseTagRaw[]>({
    config: API_CONFIG.radioBrowser,
    path: '/json/languages',
    params: {
      order: 'stationcount',
      reverse: 'true',
    },
    signal,
  });
  return drawableBrowseTagsFromRaw(raw).slice(0, limit);
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const RADIO_BROWSER_RETRIES = 2;
