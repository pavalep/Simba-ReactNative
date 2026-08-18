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
    // advancedsearch is genuinely slow on a cold CDN node (>10s before
    // the query cache warms). 10s would abort the FIRST request of a
    // session (the "first load fails, refresh works" bug) — 30s keeps
    // the ceiling inside a real query's cold latency.
    timeoutMs: 30_000,
  },
  audius: {
    baseUrl: 'https://api.audius.co',
    rateLimitMs: 300,
  },
  // P61: weather greeting on Home. No API keys, fully open source.
  // All three URLs live here so the weather service doesn't hardcode
  // anything — it imports from this file like every other service.
  weather: {
    /** IP-based geolocation. No longer used — we get coords from
     *  the device's location service (with permission) or the IANA
     *  timezone (no permission). Kept as a string for any future
     *  tool that wants a free geo source. */
    ipGeo: 'https://ipwho.is/',
    /** Open-Meteo current-weather endpoint. */
    forecast: 'https://api.open-meteo.com/v1/forecast',
    /** Open-Meteo geocoding (city name → lat/lon). */
    geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
    /** Last-resort fallback location if every network call fails. */
    fallbackCity: {
      name: 'Mumbai',
      lat: 19.076,
      lon: 72.8777,
    },
    /** Per-service rate limit, used by the future apiFetch wrapper. */
    rateLimitMs: 1000, // ip-api.com allows ~45 req/min/IP
  },
} as const;
