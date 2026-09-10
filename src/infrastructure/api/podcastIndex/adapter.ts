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
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import type {
  PodcastResult,
  PodcastEpisodeResult,
  PodcastCategoryResult,
} from '../../../types/api';
import {sha1} from 'js-sha1';
import {
  AdapterParseError,
  isArray,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  isString,
  assertShape,
} from '../adapterErrors';

export type {PodcastResult, PodcastEpisodeResult, PodcastCategoryResult};

/**
 * V21 W6 P21 (T21.04): the adapter's retry policy. The adapter
 * itself doesn't retry (TanStack Query owns retry); this constant
 * is the documented default the call site uses. Set to `2` (one
 * initial + two retries) — Podcast Index is reliable, three
 * attempts is enough for transient 5xx.
 */
export const PODCAST_INDEX_RETRIES = 2;

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

/**
 * V21 W6 P21 (T21.02): validate the wire payload against the
 * `RawEnvelope<T>` shape. Throws `AdapterParseError` if the
 * status field is missing, not the expected literal, or 'false'
 * (the upstream non-ok signal). The `expected*` flags enforce
 * that the correct array field is present for this endpoint.
 */
function parseRawEnvelope<T>(
  raw: unknown,
  options: {
    expectFeeds?: boolean;
    expectItems?: boolean;
    expectFeed?: boolean;
  },
): RawEnvelope<T> {
  const rec = assertShape(raw, 'envelope', 'podcastIndex', isRecord);
  if (rec.status !== 'true' && rec.status !== 'false') {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.status',
      `expected 'true' | 'false', got ${describe(rec.status)}`,
    );
  }
  if (rec.status === 'false') {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.status',
      'Podcast Index request returned non-ok status',
    );
  }
  if (options.expectFeeds && !('feeds' in rec)) {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.feeds',
      'expected array of feeds',
    );
  }
  if (options.expectItems && !('items' in rec)) {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.items',
      'expected array of items',
    );
  }
  if (options.expectFeed && !('feed' in rec)) {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.feed',
      'expected single feed object',
    );
  }
  return rec as unknown as RawEnvelope<T>;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  return `${typeof value} ${JSON.stringify(value)}`;
}

/** V21 W6 P21 (T21.02): validate a single RawFeed object's shape. */
function parseRawFeed(raw: unknown, path: string): RawFeed {
  const rec = assertShape(raw, path, 'podcastIndex', isRecord);
  return {
    id: assertShape(rec.id, `${path}.id`, 'podcastIndex', isFiniteNumber),
    title: assertShape(rec.title, `${path}.title`, 'podcastIndex', isString),
    author: assertShape(rec.author, `${path}.author`, 'podcastIndex', isString),
    description: assertShape(
      rec.description,
      `${path}.description`,
      'podcastIndex',
      isString,
    ),
    image: assertShape(rec.image, `${path}.image`, 'podcastIndex', isString),
    url: assertShape(rec.url, `${path}.url`, 'podcastIndex', isString),
    episodeCount: assertShape(
      rec.episodeCount,
      `${path}.episodeCount`,
      'podcastIndex',
      isFiniteNumber,
    ),
    categories: isRecord(rec.categories)
      ? (rec.categories as Record<string, string>)
      : {},
  };
}

/** V21 W6 P21 (T21.02): validate a single RawEpisode object's shape. */
function parseRawEpisode(raw: unknown, path: string): RawEpisode {
  const rec = assertShape(raw, path, 'podcastIndex', isRecord);
  return {
    id: assertShape(rec.id, `${path}.id`, 'podcastIndex', isFiniteNumber),
    title: assertShape(rec.title, `${path}.title`, 'podcastIndex', isString),
    description: assertShape(
      rec.description,
      `${path}.description`,
      'podcastIndex',
      isString,
    ),
    datePublished: assertShape(
      rec.datePublished,
      `${path}.datePublished`,
      'podcastIndex',
      isFiniteNumber,
    ),
    duration: assertShape(
      rec.duration,
      `${path}.duration`,
      'podcastIndex',
      isFiniteNumber,
    ),
    image: assertShape(rec.image, `${path}.image`, 'podcastIndex', isString),
    feedUrl: assertShape(
      rec.feedUrl,
      `${path}.feedUrl`,
      'podcastIndex',
      isString,
    ),
    enclosureUrl: assertShape(
      rec.enclosureUrl,
      `${path}.enclosureUrl`,
      'podcastIndex',
      isString,
    ),
    enclosureType: assertShape(
      rec.enclosureType,
      `${path}.enclosureType`,
      'podcastIndex',
      isString,
    ),
  };
}

/** Unwrap the Podcast Index status envelope; throws on non-ok. */
function unwrap<T>(envelope: RawEnvelope<T> | undefined): T | undefined {
  if (envelope?.status !== 'true') {
    throw new AdapterParseError(
      'podcastIndex',
      'envelope.status',
      'Podcast Index request returned non-ok status',
    );
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
  signal?: AbortSignal,
): Promise<PodcastResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawFeed>>({
    config: API_CONFIG.podcastIndex,
    path: '/search/byterm',
    params: {q: query, max},
    headers,
    signal,
  });
  const envelope = parseRawEnvelope<RawFeed>(raw, {expectFeeds: true});
  const feeds = (envelope.feeds ?? []) as unknown[];
  return podcastResultsFromRaw(feeds.map((f, i) => parseRawFeed(f, `feeds[${i}]`)));
}

export async function getTrendingPodcasts(
  max: number = 10,
  categoryId?: string,
  signal?: AbortSignal,
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
    signal,
  });
  const envelope = parseRawEnvelope<RawFeed>(raw, {expectFeeds: true});
  const feeds = (envelope.feeds ?? []) as unknown[];
  return podcastResultsFromRaw(feeds.map((f, i) => parseRawFeed(f, `feeds[${i}]`)));
}

export async function getEpisodes(
  podcastId: number,
  max: number = 10,
  signal?: AbortSignal,
): Promise<PodcastEpisodeResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawEpisode>>({
    config: API_CONFIG.podcastIndex,
    path: '/episodes/byfeedid',
    params: {id: podcastId, max},
    headers,
    signal,
  });
  const envelope = parseRawEnvelope<RawEpisode>(raw, {expectItems: true});
  const items = (envelope.items ?? []) as unknown[];
  return podcastEpisodesFromRaw(
    items.map((it, i) => parseRawEpisode(it, `items[${i}]`)),
  );
}

export async function getPodcastById(
  id: number,
  signal?: AbortSignal,
): Promise<PodcastResult | null> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<RawFeed>>({
    config: API_CONFIG.podcastIndex,
    path: '/podcasts/byfeedid',
    params: {id},
    headers,
    signal,
  });
  const envelope = parseRawEnvelope<RawFeed>(raw, {expectFeed: true});
  const feed = envelope.feed as unknown | undefined;
  return podcastResultFromRaw(
    feed !== undefined ? parseRawFeed(feed, 'feed') : undefined,
  );
}

export async function getPodcastCategories(
  signal?: AbortSignal,
): Promise<PodcastCategoryResult[]> {
  const headers = buildAuthHeaders();
  const raw = await apiFetch<RawEnvelope<{id: number; name: string}>>({
    config: API_CONFIG.podcastIndex,
    path: '/categories/list',
    headers,
    signal,
  });
  // The /categories/list endpoint returns `{status, feeds: [...]}`.
  // Validate the envelope + parse the list shape (id + name per row).
  parseRawEnvelope<{id: number; name: string}>(raw, {expectFeeds: true});
  const list = ((raw as {feeds?: unknown[]})?.feeds ?? []) as unknown[];
  return list
    .filter((row): row is {id: number; name: string} => {
      if (!isRecord(row)) return false;
      if (!isFiniteNumber(row.id)) return false;
      if (!isString(row.name)) return false;
      return true;
    })
    .map(row => ({id: row.id, name: row.name.trim()}))
    .filter(c => c.name.length > 0);
}
