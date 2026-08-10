// ─── Podcast Index API Service ──────────────────────────────────────────
// Docs: https://podcastindex-org.github.io/docs-api/

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {PodcastResult, PodcastEpisodeResult} from '../../types/api';
import {sha1} from 'js-sha1';

// ─── Auth headers ───────────────────────────────────────────────────────
// Podcast Index expects the SHA-1 in the `Authorization` header (NOT
// `X-Auth-Signature`). The API also requires a real `User-Agent` that
// identifies the project — the default `axios/x.y` is rejected with
// "You must include a proper User-Agent header in all API requests."
// See: https://podcastindex-org.github.io/docs-api/#overview--authentication-details

const PODCAST_INDEX_USER_AGENT = 'SimbaMediaPlayer/1.0.0 (paval@simba.app)';

function buildAuthHeaders(): Record<string, string> {
  const {apiKey, apiSecret} = API_CONFIG.podcastIndex;
  if (!apiKey || !apiSecret) {
    throw new Error('Podcast Index API key and secret are required');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  // js-sha1 is a single-file pure-JS SHA-1 used by millions of npm
  // projects. The previous handwritten implementation produced an
  // incorrect hash (returned 401 from Podcast Index) — replaced.
  const signature = sha1(apiKey + apiSecret + timestamp);
  return {
    'User-Agent': PODCAST_INDEX_USER_AGENT,
    'X-Auth-Key': apiKey,
    'X-Auth-Date': String(timestamp),
    Authorization: signature,
  };
}

// ─── Cache TTLs (ms) ────────────────────────────────────────────────────

const CACHE = {
  search: 10 * 60 * 1000,
  trending: 15 * 60 * 1000,
  episodes: 5 * 60 * 1000,
} as const;

// ─── Raw API response shapes ────────────────────────────────────────────

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

interface RawSearchResponse {
  status: 'true' | 'false';
  feeds: RawFeed[];
}

interface RawTrendingResponse {
  status: 'true' | 'false';
  feeds: RawFeed[];
}

interface RawEpisodesResponse {
  status: 'true' | 'false';
  items: RawEpisode[];
}

interface RawFeedResponse {
  status: 'true' | 'false';
  feed: RawFeed;
}

// ─── Mapping helpers ────────────────────────────────────────────────────

function mapFeed(feed: RawFeed): PodcastResult {
  return {
    id: feed.id,
    title: feed.title,
    author: feed.author,
    description: feed.description,
    image: feed.image,
    feedUrl: feed.url,
    episodeCount: feed.episodeCount,
    categories: feed.categories,
  };
}

function mapEpisode(ep: RawEpisode): PodcastEpisodeResult {
  return {
    id: ep.id,
    title: ep.title,
    description: ep.description,
    datePublished: ep.datePublished,
    duration: ep.duration,
    image: ep.image,
    feedUrl: ep.feedUrl,
    enclosureUrl: ep.enclosureUrl,
    enclosureType: ep.enclosureType,
  };
}

// ─── Exported functions ─────────────────────────────────────────────────

export async function searchPodcasts(
  query: string,
  max: number = 25,
): Promise<PodcastResult[]> {
  const headers = buildAuthHeaders();
  const response = await apiFetch<RawSearchResponse>({
    config: API_CONFIG.podcastIndex,
    path: '/search/byterm',
    params: {q: query, max},
    headers,
    cacheTtlMs: CACHE.search,
  });
  if (response.status !== 'true') {
    throw new Error('Podcast Index search returned non-ok status');
  }
  return (response.feeds ?? []).map(mapFeed);
}

export async function getTrendingPodcasts(
  max: number = 10,
): Promise<PodcastResult[]> {
  const headers = buildAuthHeaders();
  const response = await apiFetch<RawTrendingResponse>({
    config: API_CONFIG.podcastIndex,
    path: '/podcasts/trending',
    params: {max},
    headers,
    cacheTtlMs: CACHE.trending,
  });
  if (response.status !== 'true') {
    throw new Error('Podcast Index trending returned non-ok status');
  }
  return (response.feeds ?? []).map(mapFeed);
}

export async function getEpisodes(
  podcastId: number,
  max: number = 10,
): Promise<PodcastEpisodeResult[]> {
  const headers = buildAuthHeaders();
  const response = await apiFetch<RawEpisodesResponse>({
    config: API_CONFIG.podcastIndex,
    path: '/episodes/byfeedid',
    params: {id: podcastId, max},
    headers,
    cacheTtlMs: CACHE.episodes,
  });
  if (response.status !== 'true') {
    throw new Error('Podcast Index episodes returned non-ok status');
  }
  return (response.items ?? []).map(mapEpisode);
}

export async function getPodcastById(id: number): Promise<PodcastResult> {
  const headers = buildAuthHeaders();
  const response = await apiFetch<RawFeedResponse>({
    config: API_CONFIG.podcastIndex,
    path: '/podcasts/byfeedid',
    params: {id},
    headers,
  });
  if (response.status !== 'true' || !response.feed) {
    throw new Error('Podcast Index feed lookup returned non-ok status');
  }
  return mapFeed(response.feed);
}

