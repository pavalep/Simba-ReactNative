// ─── Shared HTTP Client ────────────────────────────────────────────────
// Axios-based: timeout, interceptors, and error normalization.
//
// V18.8.1 cleanup: removed the in-memory `cache: Map` and the
// `rateLimit` helper. TanStack Query owns caching (via `staleTime`
// on `useApiQuery`); the hook layer owns dedup and refetch
// policy. Rate limiting was removed because (a) TanStack's
// retry / dedup already prevents the worst abuse and (b) the
// per-service `rateLimitMs` config was duplicating concerns —
// if a service needs backpressure, the adapter should add it
// (or the service layer moves to a queue).
//
// What stays:
//   - The shared `axiosInstance` with the User-Agent override
//     and the request/response interceptors.
//   - The `apiFetch(opts)` wrapper: `config`, `path`, `params`,
//     `headers`, `signal` — all of which downstream adapters
//     still pass.
//   - The `ApiError` class for normalized errors.
//
// What was removed (visible only in the diff):
//   - `cache: Map<string, CacheEntry<unknown>>` + `getCached` / `setCache`
//   - `lastCallTimestamps: Map<string, number>` + `rateLimit`
//   - The `cacheTtlMs: number` field on `FetchOptions`
//   - The `cacheKey` computation in `apiFetch`
//   - The cache get / set calls in `apiFetch`
//   - 49 occurrences of `cacheTtlMs: N,` across the 9 adapter
//     files (all stripped)

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
 * shared `apiFetch` wrapper, like the weather service).
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
  /** Additional headers. */
  headers?: Record<string, string>;
  /** AbortSignal for timeout (passed to axios). */
  signal?: AbortSignal;
}

// ─── apiFetch ───────────────────────────────────────────────────────────
// V18.8.1: signature is `config / path / params / headers / signal`.
// The `cacheTtlMs` parameter was removed; caching is now owned by
// TanStack Query at the `useApiQuery` layer (`staleTime`).

export async function apiFetch<T>(opts: FetchOptions): Promise<T> {
  const {config, path, params, headers, signal} = opts;

  const url = `${config.baseUrl}${path}`;

  // Build axios config
  const axiosConfig: AxiosRequestConfig = {
    url,
    method: 'GET',
    headers: {
      ...headers,
    },
    // Per-API timeout override — slow-cold APIs (IA advancedsearch)
    // need a higher ceiling than the 10s client default.
    timeout: config.timeoutMs ?? 10_000,
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

  return response.data;
}

// ─── Pagination helper ──────────────────────────────────────────────────

export function parsePageParam(options?: ApiSearchOptions): number {
  return options?.page ?? 1;
}
