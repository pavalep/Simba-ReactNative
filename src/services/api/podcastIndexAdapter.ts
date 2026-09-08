/**
 * V18 — podcastIndexAdapter
 *
 * Replaces `podcastIndexService.ts`. Podcast Index uses an
 * envelope `{status: 'true' | 'false', feeds|items|feed}` that
 * must be checked before unwrapping. The convertor strips the
 * envelope + maps the feed/episode.
 *
 * Auth: Podcast Index requires an HMAC-style signature in the
 * `Authorization` header (SHA-1 of `apiKey + apiSecret + timestamp`)
 * and a `User-Agent` identifying the project. The auth helper
 * is encapsulated; callers don't see it.
 *
 * Pagination: most Podcast Index endpoints return a single page
 * (no offset/limit). The `getEpisodes` endpoint takes a `max`
 * param; the consumer's useApiQuery can re-call with a different
 * `max` if it wants more.
 *
 * Type contract (see SPEC §2):
 *   *Raw DTOs are file-local. *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {
  PodcastResult,
  PodcastEpisodeResult,
  PodcastCategoryResult,
} from '../../types/api';
import {sha1} from 'js-sha1';

export type {PodcastResult, PodcastEpisodeResult, PodcastCategoryResult};

const PODCAST_INDEX_USER_AGENT = 'SimbaMediaPlayer/1.0.0 (paval@simba.app)';

const CACHE = {
  search: 10 * 60 * 1000,
  trending: 15 * 60 * 1000,
  episodes: 5 * 60 * 1000,
  categories: 24 * 60 * 60 * 1000,
} as const;

function buildAuthHeaders(): Record<string, string> {
  const {apiKey, apiSecret} = API_CONFIG.podcastIndex;
  if (!apiKey || !apiSecret) {
    throw new Error('Podcast Index API key and secret are required');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sha1(apiKey + apiSecret + timestamp);
  return {
    'User-Agent': PODCAST_INDEX_USER_AGENT,
    'X-Auth-Key': apiKey,
    'X-Auth-Date': String(timestamp),
    Authorization: signature,
  };
}

interface RawFeed {
  id: number;
  title: string;
  author: string;
  description: string;
  image: string;
  url: string;
  episodeCount: number;
  categories: Record<string, string>;
}

interface RawEpisode {
  id: number;
  title: string;
  description: string;
  datePublished: number;
  duration: number;
  image: string;
  feedUrl: string;
  enclosureUrl: string;
  enclosureType: string;
}

interface RawEnvelope<T> {
  status: 'true' | 'false';
  feeds?: T[] | RawFeed;
  items?: T[];
  feed?: T;
}

/** Unwrap the Podcast Index status envelope; throws on non-ok. */
function unwrap<T>(envelope: RawEnvelope<T> | undefined): T | undefined {
  if (envelope?.status !== 'true') {
    throw new Error('Podcast Index request returned non-ok status');
  }
  return undefined;
}

function unwrapArray<T>(envelope: RawEnvelope<T> | undefined): T[] {
  unwrap(envelope);
  if (Array.isArray(envelope?.feeds)) return envelope.feeds;
  if (Array.isArray(envelope?.items)) return envelope.items;
  return [];
}

function unwrapSingle<T>(envelope: RawEnvelope<T> | undefined): T | undefined {
  unwrap(envelope);
  return (envelope?.feed ?? undefined) as T | undefined;
}

export function podcastResultFromRaw(
  raw: RawFeed | undefined,
): PodcastResult | null {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    author: raw.author,
    description: raw.description,
    image: raw.image,
    feedUrl: raw.url,
    episodeCount: raw.episodeCount,
    categories: raw.categories,
  };
}

export function podcastResultsFromRaw(
  raw: RawFeed[] | undefined,
): PodcastResult[] {
  return (raw ?? [])
    .map(podcastResultFromRaw)
    .filter((p): p is PodcastResult => p !== null);
}

export function podcastEpisodeResultFromRaw(
  raw: RawEpisode | undefined,
): PodcastEpisodeResult | null {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    datePublished: raw.datePublished,
    duration: raw.duration,
    image: raw.image,
    feedUrl: raw.feedUrl,
    enclosureUrl: raw.enclosureUrl,
    enclosureType: raw.enclosureType,
  };
}

export function podcastEpisodesFromRaw(
  raw: RawEpisode[] | undefined,
): PodcastEpisodeResult[] {
  return (raw ?? [])
    .map(podcastEpisodeResultFromRaw)
    .filter((e): e is PodcastEpisodeResult => e !== null);
}

function categoryFromRaw(
  raw: {id: number; name: string} | undefined,
): PodcastCategoryResult | null {
  if (!raw || !Number.isFinite(raw.id) || !raw.name?.trim()) return null;
  return {id: raw.id, name: raw.name.trim()};
}

export async function searchPodcasts(
  query: string,
  max: number = 25,
): Promise<PodcastResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawFeed>>({
    config: API_CONFIG.podcastIndex,
    path: '/search/byterm',
    params: {q: query, max},
    headers,
  });
  return podcastResultsFromRaw(unwrapArray<RawFeed>(raw));
}

export async function getTrendingPodcasts(
  max: number = 10,
  categoryId?: string,
): Promise<PodcastResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawFeed>>({
    config: API_CONFIG.podcastIndex,
    path: '/podcasts/trending',
    params: {
      max,
      ...(categoryId && categoryId !== 'all' ? {cat: categoryId} : {}),
    },
    headers,
  });
  return podcastResultsFromRaw(unwrapArray<RawFeed>(raw));
}

export async function getEpisodes(
  podcastId: number,
  max: number = 10,
): Promise<PodcastEpisodeResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawEpisode>>({
    config: API_CONFIG.podcastIndex,
    path: '/episodes/byfeedid',
    params: {id: podcastId, max},
    headers,
  });
  return podcastEpisodesFromRaw(unwrapArray<RawEpisode>(raw));
}

export async function getPodcastById(id: number): Promise<PodcastResult | null> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawFeed>>({
    config: API_CONFIG.podcastIndex,
    path: '/podcasts/byfeedid',
    params: {id},
    headers,
  });
  return podcastResultFromRaw(unwrapSingle<RawFeed>(raw));
}

export async function getPodcastCategories(): Promise<PodcastCategoryResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<{id: number; name: string}>>({
    config: API_CONFIG.podcastIndex,
    path: '/categories/list',
    headers,
  });
  const list = (raw?.feeds as {id: number; name: string}[] | undefined) ?? [];
  return list
    .map(categoryFromRaw)
    .filter((c): c is PodcastCategoryResult => c !== null);
}
