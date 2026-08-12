// ─── Shared HTTP Client ────────────────────────────────────────────────
// Axios-based: rate limiting, in-memory caching, timeout, interceptors,
// and error normalization.
//
// All services that need to make HTTP calls should go through the
// exported `axiosInstance` (or call `apiFetch()` for the rate-limited,
// cache-aware variant). Do NOT create your own axios.create() in a
// service — every instance is configured the same way (User-Agent,
// timeout, request/response logging) and we want one place to evolve
// that contract.

import axios, {type AxiosInstance, type AxiosError, type AxiosRequestConfig} from 'axios';
import type {ApiConfig, ApiSearchOptions} from '../../types/api';
import {logger} from '../../lib/logger';

// ─── Axios Instance ─────────────────────────────────────────────────────
// We keep it local so interceptors don't pollute the global axios.

// Default User-Agent applied to every request that doesn't override it.
// Several public APIs (Podcast Index, TVmaze, Radio-Browser, MusicBrainz)
// require or strongly recommend clients to identify themselves. The
// axios default `User-Agent: axios/x.y` gets blocked / throttled.
const DEFAULT_USER_AGENT = 'SimbaMediaPlayer/1.0.0 (paval@simba.app)';

/**
 * The shared, lazily-constructed axios instance. Every API call in
 * the app goes through this — services should `import {axiosInstance}`
 * and call `axiosInstance.get(...)` directly when they need raw
 * axios (e.g. for one-off endpoints that don't go through the
 * rate-limited `apiFetch` wrapper, like the weather service).
 */
export let axiosInstance: AxiosInstance | null = null;

/** Returns the shared axios instance, creating it on first call. */
export function getAxiosInstance(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({
      timeout: 10_000,
      headers: {
        Accept: 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    // ── Request interceptor ──
    axiosInstance.interceptors.request.use(
      cfg => {
        logger.debug(`[API] ${cfg.method?.toUpperCase()} ${cfg.url}`);
        return cfg;
      },
      err => Promise.reject(err),
    );

    // ── Response interceptor ──
    axiosInstance.interceptors.response.use(
      res => res,
      (err: AxiosError) => {
        const status = err.response?.status ?? 0;
        const msg =
          err.response?.data && typeof err.response.data === 'object'
            ? JSON.stringify(err.response.data)
            : err.message;
        return Promise.reject(new ApiError(msg, status));
      },
    );
  }
  return axiosInstance;
}

// ─── Cache ──────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {return null;}
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {data, expiresAt: Date.now() + ttlMs});
}

// ─── Rate Limiter ───────────────────────────────────────────────────────

const lastCallTimestamps = new Map<string, number>();

async function rateLimit(key: string, minIntervalMs: number): Promise<void> {
  const last = lastCallTimestamps.get(key) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < minIntervalMs) {
    await new Promise<void>(resolve => setTimeout(() => resolve(), minIntervalMs - elapsed));
  }
  lastCallTimestamps.set(key, Date.now());
}

// ─── ApiError ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Shared request options ─────────────────────────────────────────────

interface FetchOptions {
  config: ApiConfig;
  path: string;
  params?: Record<string, string | number | undefined>;
  /** Cache TTL in ms. 0 = no cache. */
  cacheTtlMs?: number;
  /** Additional headers. */
  headers?: Record<string, string>;
  /** AbortSignal for timeout (passed to axios cancelToken / signal). */
  signal?: AbortSignal;
}

// ─── apiFetch ───────────────────────────────────────────────────────────
// Signature unchanged: all 10 consumers keep working.

export async function apiFetch<T>(opts: FetchOptions): Promise<T> {
  const {config, path, params, cacheTtlMs = 0, headers, signal} = opts;

  // Build URL (just for cache key & logging; axios gets the full URL)
  const url = `${config.baseUrl}${path}`;

  const cacheKey = url + (params ? JSON.stringify(params) : '');

  // Check cache
  if (cacheTtlMs > 0) {
    const cached = getCached<T>(cacheKey);
    if (cached) {return cached;}
  }

  // Rate limit
  await rateLimit(config.baseUrl, config.rateLimitMs);

  // Build axios config
  const axiosConfig: AxiosRequestConfig = {
    url,
    method: 'GET',
    headers: {
      ...headers,
    },
    signal,
  };

  // Merge URL params (query string)
  const mergedParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) {mergedParams[k] = String(v);}
    });
  }
  if (config.apiKey) {
    mergedParams.api_key = config.apiKey;
  }
  if (Object.keys(mergedParams).length > 0) {
    axiosConfig.params = mergedParams;
  }

  const instance = getAxiosInstance();

  const response = await instance.get<T>(url, axiosConfig);

  const data = response.data;

  // Cache
  if (cacheTtlMs > 0) {
    setCache(cacheKey, data, cacheTtlMs);
  }

  return data;
}

// ─── Pagination helper ──────────────────────────────────────────────────

export function parsePageParam(options?: ApiSearchOptions): number {
  return options?.page ?? 1;
}
