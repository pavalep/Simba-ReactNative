/**
 * V18 — iptvAdapter
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
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {IPTVChannelResult, IPTVCategory, ApiSearchOptions} from '../../types/api';

export type {IPTVChannelResult, IPTVCategory};

const SEARCH_CACHE_TTL = 600_000; // 10 min

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

export function channelResultFromRaw(
  raw: IPTVChannelRaw | undefined,
): IPTVChannelResult | null {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    logo: raw.logo || '',
    country: raw.country || '',
    countryCode: raw.country_code || '',
    language: raw.languages?.[0] || '',
    category: raw.categories?.[0] || '',
    isPlayable: raw.is_playable !== false,
  };
}

export function channelResultsFromRaw(
  raw: IPTVChannelRaw[] | undefined,
): IPTVChannelResult[] {
  return (raw ?? [])
    .map(channelResultFromRaw)
    .filter((c): c is IPTVChannelResult => c !== null);
}

export function categoryResultFromRaw(
  raw: IPTVCategoryRaw | undefined,
): IPTVCategory | null {
  if (!raw) return null;
  return {id: raw.id, name: raw.name, channelCount: raw.channel_count};
}

function categoryResultsFromRaw(
  raw: IPTVCategoryRaw[] | undefined,
): IPTVCategory[] {
  return (raw ?? [])
    .map(categoryResultFromRaw)
    .filter((c): c is IPTVCategory => c !== null);
}

export async function getAllIPTVChannels(
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const raw = await apiFetch<IPTVChannelRaw[]>({
    config: API_CONFIG.iptv,
    path: '/channels.json',
  });
  const all = channelResultsFromRaw(raw);
  // In-memory pagination (the API returns the full list).
  const limit = options?.limit ?? 50;
  return all.slice(0, limit);
}

export async function searchIPTVChannels(
  query: string,
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500});
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
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500});
  return all.filter(
    c => c.countryCode.toUpperCase() === countryCode.toUpperCase(),
  );
}

export async function getChannelsByCategory(
  category: string,
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500});
  return all.filter(
    c => c.category.toLowerCase() === category.toLowerCase(),
  );
}

export async function getIPTVCategories(): Promise<IPTVCategory[]> {
  const raw = await apiFetch<IPTVCategoryRaw[]>({
    config: API_CONFIG.iptv,
    path: '/categories.json',
  });
  return categoryResultsFromRaw(raw);
}

export async function getIPTVChannelById(
  id: string,
): Promise<IPTVChannelResult | null> {
  try {
    const all = await getAllIPTVChannels({limit: 1000});
    return all.find(c => c.id === id) ?? null;
  } catch {
    return null;
  }
}
