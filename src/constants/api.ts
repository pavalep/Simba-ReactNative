// ─── API Endpoint Configuration ─────────────────────────────────────────
// Base URLs, default params, and rate-limit settings per API.

import {ENV} from './env';

export const API_CONFIG = {
  tvmaze: {
    baseUrl: 'https://api.tvmaze.com',
    rateLimitMs: 200,
  },
  musicbrainz: {
    baseUrl: 'https://musicbrainz.org/ws/2',
    rateLimitMs: 1000, // MusicBrainz requires 1 req/s
    userAgent: 'SimbaMediaPlayer/1.0.0 (paval@simba.app)',
  },
  podcastIndex: {
    baseUrl: 'https://api.podcastindex.org/api/1.0',
    apiKey: ENV.PODCAST_INDEX_API_KEY,
    apiSecret: ENV.PODCAST_INDEX_API_SECRET,
    rateLimitMs: 200,
  },
  radioBrowser: {
    baseUrl: 'https://de1.api.radio-browser.info',
    rateLimitMs: 200,
  },
  librivox: {
    baseUrl: 'https://librivox.org/api/feed/audiobooks',
    rateLimitMs: 200,
  },
  iptv: {
    baseUrl: 'https://iptv-org.github.io/api',
    rateLimitMs: 500,
    m3uBaseUrl: 'https://iptv-org.github.io/iptv',
  },
  jamendo: {
    baseUrl: 'https://api.jamendo.com/v3.0',
    clientId: ENV.JAMENDO_CLIENT_ID,
    clientSecret: ENV.JAMENDO_CLIENT_SECRET,
    rateLimitMs: 200,
  },
  internetArchive: {
    baseUrl: 'https://archive.org',
    rateLimitMs: 500,
  },
  audius: {
    baseUrl: 'https://api.audius.co',
    rateLimitMs: 300,
  },
} as const;
