// ─── Podcast Index API Service ──────────────────────────────────────────
// Docs: https://podcastindex-org.github.io/docs-api/

/* eslint-disable no-bitwise */

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {PodcastResult, PodcastEpisodeResult} from '../../types/api';

// ─── Pure-JS SHA1 helper (no Web Crypto API dependency) ───────────────
// Works in React Native where TextEncoder / crypto.subtle are unavailable.

function sha1(str: string): Promise<string> {
  // Pure JS SHA-1 implementation
  function rotl(n: number, b: number): number {
    return (n << b) | (n >>> (32 - b));
  }

  function toHexStr(n: number): string {
    let s = '';
    let v: number;
    for (let i = 7; i >= 0; i--) {
      v = (n >>> (i * 4)) & 0x0f;
      s += v.toString(16);
    }
    return s;
  }

  const blocks: number[] = [];
  const strLen = str.length;

  // Convert string to UTF-8 bytes manually
  const utf8: number[] = [];
  for (let i = 0; i < strLen; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      utf8.push(c);
    } else if (c < 0x800) {
      utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    }
  }

  const ml = utf8.length * 8;

  // Pad
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }

  // Append length in bits as 64-bit big-endian
  for (let i = 7; i >= 0; i--) {
    utf8.push((ml >>> (i * 8)) & 0xff);
  }

  // Process 512-bit blocks
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let blockStart = 0; blockStart < utf8.length; blockStart += 64) {
    for (let i = 0; i < 16; i++) {
      blocks[i] =
        (utf8[blockStart + i * 4] << 24) |
        (utf8[blockStart + i * 4 + 1] << 16) |
        (utf8[blockStart + i * 4 + 2] << 8) |
        utf8[blockStart + i * 4 + 3];
    }

    for (let i = 16; i < 80; i++) {
      blocks[i] = rotl(blocks[i - 3] ^ blocks[i - 8] ^ blocks[i - 14] ^ blocks[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotl(a, 5) + f + e + k + blocks[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return Promise.resolve(toHexStr(h0) + toHexStr(h1) + toHexStr(h2) + toHexStr(h3) + toHexStr(h4));
}

// ─── Auth headers ───────────────────────────────────────────────────────

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const {apiKey, apiSecret} = API_CONFIG.podcastIndex;
  if (!apiKey || !apiSecret) {
    throw new Error('Podcast Index API key and secret are required');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1(apiKey + apiSecret + timestamp);
  return {
    'X-Auth-Key': apiKey,
    'X-Auth-Date': String(timestamp),
    'X-Auth-Signature': signature,
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

export async function searchPodcasts(query: string): Promise<PodcastResult[]> {
  const headers = await buildAuthHeaders();
  const response = await apiFetch<RawSearchResponse>({
    config: API_CONFIG.podcastIndex,
    path: '/search/byterm',
    params: {q: query, max: 25},
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
  const headers = await buildAuthHeaders();
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
  const headers = await buildAuthHeaders();
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
  const headers = await buildAuthHeaders();
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
