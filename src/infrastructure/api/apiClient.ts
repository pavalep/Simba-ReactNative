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
        const kind = classifyApiError(err);
        const status = err.response?.status ?? 0;
        if (kind === 'http') {
          // A 4xx is the server answering: its body says what it
          // rejected, and the existing behaviour of passing that body
          // through is kept.
          const msg =
            err.response?.data && typeof err.response.data === 'object'
              ? JSON.stringify(err.response.data)
              : err.message;
          return Promise.reject(new ApiError(msg, status, kind));
        }
        // A transport failure in React Native arrives as axios's bare
        // "Network Error" — the same string for a wrong device clock, a
        // captive portal, a dead cell connection and a blocked host. The
        // raw text is kept for the log; the user gets a line that says
        // something true and actionable, and nothing about the app's
        // internals.
        logger.debug(`[API] transport failure (${kind}): ${err.message}`);
        return Promise.reject(new ApiError(TRANSPORT_MESSAGES[kind], status, kind));
      },
    );
  }
  return axiosInstance;
}

// ─── ApiError ───────────────────────────────────────────────────────────

/**
 * What KIND of failure it was.
 *
 * `'network'` — no HTTP response at all: the host was unreachable, a
 *               captive portal intercepted the request, or the TLS
 *               handshake was refused (a device with the wrong clock
 *               lands here).
 * `'timeout'` — the request timed out.
 * `'server'`  — the server answered with a 5xx.
 * `'http'`    — the server answered with a 4xx.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'server' | 'http';

/**
 * The user-facing copy for a transport failure.
 *
 * It says what happened and what to do, blames nothing, and leaks
 * nothing about the app's internals.
 */
const TRANSPORT_MESSAGES: Record<Exclude<ApiErrorKind, 'http'>, string> = {
  network: "Can't reach the server right now. Try again.",
  timeout: 'The server took too long to answer. Try again.',
  server: 'The server had a problem. Try again in a moment.',
};

/** Classify an axios failure into the kind the UI can talk about. */
function classifyApiError(err: AxiosError): ApiErrorKind {
  const status = err.response?.status;
  if (typeof status === 'number') {
    return status >= 500 ? 'server' : 'http';
  }
  // axios reports a timeout as ECONNABORTED (the XHR adapter) or
  // ETIMEDOUT (the node adapter).
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return 'timeout';
  }
  return 'network';
}

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  constructor(message: string, status: number, kind: ApiErrorKind = 'http') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
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
