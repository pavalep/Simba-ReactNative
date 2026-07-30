// ─── IPTV-org Service ──────────────────────────────────────────────────
// Fetches live TV channels from the open IPTV-org GitHub project.
// Provides direct playable stream URLs consumable via libmpv.
// No authentication required.
//
// Data sources:
//   - https://iptv-org.github.io/api/channels.json   (channel metadata)
//   - https://iptv-org.github.io/api/categories.json (categories)
//   - https://iptv-org.github.io/iptv/index.m3u      (master playlist)

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {
  IPTVChannelResult,
  IPTVCategory,
  ApiSearchOptions,
} from '../../types/api';

// ─── Raw API response types ───────────────────────────────────────────

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

// ─── Public API functions ─────────────────────────────────────────────

/** Fetch all IPTV channels (filterable in-memory). */
export async function getAllIPTVChannels(
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const raw = await apiFetch<IPTVChannelRaw[]>({
    config: API_CONFIG.iptv,
    path: '/channels.json',
    cacheTtlMs: 600_000,
  });

  let channels = raw.map(c => ({
    id: c.id,
    name: c.name,
    url: c.url,
    logo: c.logo || '',
    country: c.country || '',
    countryCode: c.country_code || '',
    language: c.languages?.[0] || '',
    category: c.categories?.[0] || '',
    isPlayable: c.is_playable !== false,
  }));

  // In-memory pagination
  const limit = options?.limit ?? 50;
  channels = channels.slice(0, limit);

  return channels;
}

/** Search IPTV channels by name. */
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

/** Get IPTV channels filtered by country code (e.g. 'US', 'GB', 'IN'). */
export async function getChannelsByCountry(
  countryCode: string,
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500});
  return all.filter(
    c => c.countryCode.toUpperCase() === countryCode.toUpperCase(),
  );
}

/** Get IPTV channels filtered by category (e.g. 'news', 'sports', 'music'). */
export async function getChannelsByCategory(
  category: string,
  options?: ApiSearchOptions,
): Promise<IPTVChannelResult[]> {
  const all = await getAllIPTVChannels({...options, limit: 500});
  return all.filter(
    c => c.category.toLowerCase() === category.toLowerCase(),
  );
}

/** Fetch all available IPTV categories. */
export async function getIPTVCategories(): Promise<IPTVCategory[]> {
  const raw = await apiFetch<{id: string; name: string; channel_count: number}[]>({
    config: API_CONFIG.iptv,
    path: '/categories.json',
    cacheTtlMs: 600_000,
  });
  return raw.map(c => ({
    id: c.id,
    name: c.name,
    channelCount: c.channel_count,
  }));
}

/** Get a single channel by its ID (returns M3U playable stream URL in channel.url). */
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
