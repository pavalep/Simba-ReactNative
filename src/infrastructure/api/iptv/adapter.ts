/**
 * ─── iptvAdapter — the IPTV-org catalogue ────────────────────────────
 *
 * The channel directory, as ONE fetch.
 *
 * WAVE B13.1 (2026-11-17) — this file was rewritten. It used to read
 * `api/channels.json` and demand a `url` from every record. That file has
 * no `url` — it is a directory of NAMES, and the stream URL lives in
 * `api/streams.json`. The convertor threw on the first row, the whole
 * batch was rejected, and Live TV showed an error card for every channel
 * (the screenshot the user sent). The Search screen's "TV" group was
 * broken the same way and had always been empty.
 *
 * The source also publishes the playlist it publishes FOR PLAYERS:
 * `iptv/index.category.m3u` — one file in which every entry carries the
 * id, the logo, the category AND the stream URL. Measured 2026-11-17:
 *
 *   - `index.category.m3u` — 2,822,591 bytes, 12,269 entries,
 *     11,558 unique `tvg-id`, 11,543 with a playable http(s) URL.
 *   - `api/categories.json` — 856 bytes, 30 categories (id → name).
 *   - `api/countries.json`  — 4,248 bytes, 250 countries (code → name).
 *
 * That is 2,827,695 bytes ONCE. The old route downloaded 1,047,201 bytes
 * on EVERY scope change (the query key carried the category and the
 * search term) and rendered nothing, every time.
 *
 * Type contract (unchanged from V21 W6 P21c):
 *   *Raw DTOs are file-local. *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 *
 * The playlist text lives in `./m3u` (pure) and the domain lives in
 * `./catalogue` (pure). This file is the only thing that touches the
 * network.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import {parseIPTVM3U} from './m3u';
import {buildIPTVCatalogue, type IPTVCatalogue} from './catalogue';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';

export type {IPTVChannelResult, IPTVCategory};
export type {IPTVCatalogue};

/** A category as the source serves it: `id`, `name`, `description`. */
interface IPTVCategoryRaw {
  id: string;
  name: string;
}

/** A country as the source serves it: `name`, `code`, `languages`, `flag`. */
interface IPTVCountryRaw {
  name: string;
  code: string;
}

/** The playlist the catalogue is built from. */
const CATALOGUE_PLAYLIST_PATH = '/index.category.m3u';

/**
 * The category id → name map.
 *
 * A MENU, not a record: a row that cannot be drawn (no id, no name) is
 * dropped and the rest of the menu survives. The old adapter's strict
 * per-record convertor rejected the WHOLE batch for one bad row, which
 * voided every category because the source happened to serve one.
 */
export function categoryNameMapFromRaw(raw: unknown): Map<string, string> {
  if (raw === undefined || raw === null) return new Map();
  if (!Array.isArray(raw)) {
    throw new AdapterParseError('iptv', 'categories', 'expected array of categories');
  }
  const map = new Map<string, string>();
  for (const row of raw as Partial<IPTVCategoryRaw>[]) {
    if (typeof row?.id !== 'string' || row.id.length === 0) continue;
    if (typeof row.name !== 'string' || row.name.length === 0) continue;
    map.set(row.id.toLowerCase(), row.name);
  }
  return map;
}

/**
 * The country code → name map.
 *
 * Also a menu: a row without a code or without a name is dropped.
 */
export function countryNameMapFromRaw(raw: unknown): Map<string, string> {
  if (raw === undefined || raw === null) return new Map();
  if (!Array.isArray(raw)) {
    throw new AdapterParseError('iptv', 'countries', 'expected array of countries');
  }
  const map = new Map<string, string>();
  for (const row of raw as Partial<IPTVCountryRaw>[]) {
    if (typeof row?.code !== 'string' || row.code.length === 0) continue;
    if (typeof row.name !== 'string' || row.name.length === 0) continue;
    map.set(row.code.toLowerCase(), row.name);
  }
  return map;
}

/**
 * The whole channel directory, as the app understands it.
 *
 * One call, one query key, one download. The three requests go out
 * together: the playlist carries the channels, and the two tiny JSON maps
 * turn the playlist's ids into the words the app shows ("News",
 * "United States").
 *
 * @param signal AbortSignal — TanStack Query cancels a stale catalogue
 *   fetch on unmount.
 */
export async function getIPTVCatalogue(
  signal?: AbortSignal,
): Promise<IPTVCatalogue> {
  const [playlist, categories, countries] = await Promise.all([
    apiFetch<string>({
      config: API_CONFIG.iptvPlaylist,
      path: CATALOGUE_PLAYLIST_PATH,
      // The playlist is not JSON. Without this the client would try to
      // parse it, and the `Accept` header would claim JSON to a server
      // that is handing over a playlist.
      headers: {Accept: 'audio/x-mpegurl, text/plain, */*'},
      responseType: 'text',
      signal,
    }),
    apiFetch<IPTVCategoryRaw[]>({
      config: API_CONFIG.iptv,
      path: '/categories.json',
      signal,
    }),
    apiFetch<IPTVCountryRaw[]>({
      config: API_CONFIG.iptv,
      path: '/countries.json',
      signal,
    }),
  ]);

  const entries = parseIPTVM3U(playlist ?? '');
  return buildIPTVCatalogue(
    entries,
    categoryNameMapFromRaw(categories),
    countryNameMapFromRaw(countries),
  );
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const IPTV_RETRIES = 2;
