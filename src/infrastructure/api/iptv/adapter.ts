/**
 * V18 + V21 W6 P21c — iptvAdapter
 *
 * Replaces `iptvService.ts`. IPTV-org returns an array of channel
 * metadata; the convertor flattens the array and applies the
 * per-channel field renames. Pagination is in-memory (the API
 * returns the full list, the client slices by `options.limit`).
 *
 * Type contract (see SPEC §2):
 *   *Raw DTOs are file-local. *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `channelResultFromRaw` validates per-channel shape and throws
 * `AdapterParseError` for malformed records (was silent `null`
 * skip pre-W22 — the user saw fewer channels than the API returned,
 * with no diagnostic). `categoryResultFromRaw` follows the same
 * pattern. The list convertors (`channelResultsFromRaw` /
 * `categoryResultsFromRaw`) reject the whole batch on malformed
 * records. All 6 service functions accept `signal?: AbortSignal`
 * so TanStack Query can cancel stale requests on screen unmount /
 * query-key change.
 *
 * The Jamendo / Audius / Internet Archive adapters are the
 * proof-of-pattern references for the W6 P21c shape; this file
 * follows the same pattern.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {IPTVChannelResult, IPTVCategory, ApiSearchOptions} from '../../../types/api';

export type {IPTVChannelResult, IPTVCategory};

interface IPTVChannelRaw {
  id: string;
  name: string;
  url: string;
  logo: string;
  country: string;
  country_code: string;
  languages: string[];
  categories: string[];
  is_playable: boolean;
}

interface IPTVCategoryRaw {
  id: string;
  name: string;
  channel_count: number;
}

/**
 * V21 W6 P21c — per-channel shape validation.
 * Throws `AdapterParseError` for malformed records (was silent
 * `null` skip pre-W22).
 */
function parseRawIPTVChannel(
  raw: unknown,
  path: string,
): IPTVChannelResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError('iptv', path, 'expected channel object');
  }
  const c = raw as Partial<IPTVChannelRaw>;
  if (typeof c.id !== 'string' || c.id.length === 0) {
    throw new AdapterParseError(
      'iptv',
      `${path}.id`,
      'expected non-empty string',
    );
  }
  if (typeof c.name !== 'string') {
    throw new AdapterParseError(
      'iptv',
      `${path}.name`,
      'expected string',
    );
  }
  if (typeof c.url !== 'string' || c.url.length === 0) {
    throw new AdapterParseError(
      'iptv',
      `${path}.url`,
      'expected non-empty stream url',
    );
  }
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    image: c.logo || '',
    country: c.country || '',
    countryCode: c.country_code || '',
    language: c.languages?.[0] || '',
    category: c.categories?.[0] || '',
    isPlayable: c.is_playable !== false,
  };
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 * Pre-W22 returned `null` for malformed / undefined input and
 * the caller filtered it out. Now throws `AdapterParseError`.
 * The wrapper keeps the convertor-name `channelResultFromRaw`
 * exported for any consumer that imports it by name.
 */
export function channelResultFromRaw(
  raw: unknown,
  path: string = 'channel',
): IPTVChannelResult {
  return parseRawIPTVChannel(raw, path);
}

export function channelResultsFromRaw(
  raw: unknown,
): IPTVChannelResult[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'iptv',
      'envelope',
      'expected array of channels',
    );
  }
  return raw.map((c, i) => parseRawIPTVChannel(c, `channels[${i}]`));
}

/**
 * V21 W6 P21c — per-category shape validation.
 */
function parseRawIPTVCategory(
  raw: unknown,
  path: string,
): IPTVCategory {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError('iptv', path, 'expected category object');
  }
  const c = raw as Partial<IPTVCategoryRaw>;
  if (typeof c.id !== 'string' || c.id.length === 0) {
    throw new AdapterParseError(
      'iptv',
      `${path}.id`,
      'expected non-empty string',
    );
  }
  if (typeof c.name !== 'string') {
    throw new AdapterParseError(
      'iptv',
      `${path}.name`,
      'expected string',
    );
  }
  if (typeof c.channel_count !== 'number' || c.channel_count < 0) {
    throw new AdapterParseError(
      'iptv',
      `${path}.channel_count`,
      `expected non-negative number, got ${c.channel_count}`,
    );
  }
  return {id: c.id, name: c.name, channelCount: c.channel_count};
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 */
export function categoryResultFromRaw(
  raw: unknown,
  path: string = 'category',
): IPTVCategory {
  return parseRawIPTVCategory(raw, path);
}

function categoryResultsFromRaw(raw: unknown): IPTVCategory[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'iptv',
      'envelope',
      'expected array of categories',
    );
  }
  return raw.map((c, i) => parseRawIPTVCategory(c, `categories[${i}]`));
}

export async function getAllIPTVChannels(
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<IPTVChannelResult[]> {
  const raw = await apiFetch<IPTVChannelRaw[]>({
    config: API_CONFIG.iptv,
    path: '/channels.json',
    signal,
  });
  const all = channelResultsFromRaw(raw);
  // In-memory pagination (the API returns the full list).
  const limit = options?.limit ?? 50;
  return all.slice(0, limit);
}

export async function searchIPTVChannels(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500}, signal);
  const q = query.toLowerCase();
  return all.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q),
  );
}

export async function getChannelsByCountry(
  countryCode: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500}, signal);
  return all.filter(
    c => c.countryCode.toUpperCase() === countryCode.toUpperCase(),
  );
}

export async function getChannelsByCategory(
  category: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500}, signal);
  return all.filter(
    c => c.category.toLowerCase() === category.toLowerCase(),
  );
}

export async function getIPTVCategories(
  signal?: AbortSignal,
): Promise<IPTVCategory[]> {
  const raw = await apiFetch<IPTVCategoryRaw[]>({
    config: API_CONFIG.iptv,
    path: '/categories.json',
    signal,
  });
  return categoryResultsFromRaw(raw);
}

/**
 * Get full channel details. Returns `null` on a not-found
 * (channel id doesn't match any entry); transport failures
 * are swallowed, wire-shape failures propagate.
 */
export async function getIPTVChannelById(
  id: string,
  signal?: AbortSignal,
): Promise<IPTVChannelResult | null> {
  try {
    const all = await getAllIPTVChannels({limit: 1000}, signal);
    return all.find(c => c.id === id) ?? null;
  } catch (e) {
    // V21 W6 P21c: transport failures swallowed, shape
    // failures propagate so the caller can distinguish "server
    // down" from "server returned garbage".
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const IPTV_RETRIES = 2;
