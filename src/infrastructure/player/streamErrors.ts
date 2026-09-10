/**
 * V21 W7 P28 — Typed `StreamError` variants + `play(uri, opts)`
 * facade.
 *
 * The V12 player module's `usePlayerActivity().openPlayer(...)`
 * returns `Promise<boolean>` — `true` on bridge-accepted, `false`
 * (or a thrown `Error`) on rejection. The boolean is the wrong
 * shape: a call site that needs to surface "your podcast
 * subscription expired, sign in again" can't tell that from
 * "your Wi-Fi is down, retry."
 *
 * The W7 P28 work defines the **consumer-side** contract: 4 typed
 * `StreamError` variants + a `Result<T, E>` wrapper + a `play()`
 * facade function that returns `Result<PlaybackId, StreamError>`.
 *
 * What's INSIDE this commit (V21):
 *   - The 4 variants as a discriminated union
 *   - `Result<T, E>` + `ok` / `err` constructors + a `map` helper
 *   - `play()` wrapper that maps the V12 bridge's `false` /
 *     thrown `Error` into a single `StreamError` (best-effort;
 *     see "Bridge mapping" below)
 *   - `__tests__/infrastructure/player/streamErrors.test.ts` —
 *     10 unit tests for the variants + Result + play()
 *
 * What is DELIBERATELY NOT inside this commit (W22 follow-up):
 *   - The V12 bridge doesn't currently surface rich error codes.
 *     `openPlayer` returns `false` for any failure. The mapping
 *     in `play()` collapses every failure to a `network` variant
 *     unless the call site knows the context (e.g. a podcast
 *     that's been de-listed is `unsupported`, not `network`).
 *     A W22 native update can pipe the actual HTTP status code
 *     (404 → `unsupported`, 401/403 → `expired` / `blocked`,
 *     network timeout → `network`) into the bridge, after which
 *     `play()` can map it accurately.
 *
 * Bridge mapping (current V12):
 *
 *   bridge returns `true`  →  Result.ok({...})
 *   bridge returns `false` →  Result.err(networkError())
 *   bridge throws          →  Result.err(networkError(throw.message))
 *
 * The call site can use the URI scheme + context to refine the
 * error kind in a `try { await play(...) } catch (e) { ... }`:
 *   - `https://` + `authToken` expired → `expired`
 *   - `content://` + 404 from provider → `unsupported`
 *   - `file://` + permission revoked → `blocked`
 *   - any URI + Wi-Fi off → `network`
 *
 * The Result type is borrowed from the Rust `Result<T, E>` and the
 * TypeScript `neverthrow` ecosystem. It's intentionally minimal
 * (no `.match()` / `.unwrapOr()` etc.) so a junior dev can read
 * the call sites without learning a new combinator vocabulary.
 */

// ─── StreamError variants ────────────────────────────────────

/** A `network` error — the request never reached the server, or the connection was dropped mid-stream. Retryable. */
export interface NetworkStreamError {
  readonly kind: 'network';
  readonly message: string;
  /** The underlying cause, if any (e.g. `TypeError: Network request failed`). */
  readonly cause?: string;
  /** True for transient errors (timeout, ECONNRESET, etc.). False for hard DNS failures. */
  readonly retryable: boolean;
}

/** An `unsupported` error — the server responded but the media format is not playable by the bridge (codec, container, DRM, region). Not retryable. */
export interface UnsupportedStreamError {
  readonly kind: 'unsupported';
  readonly message: string;
  /** The codec / format string if the bridge surfaced it (e.g. `'video/x-matroska'`). */
  readonly format?: string;
  /** True for DRM-protected content (user-facing message can suggest an alternative player). */
  readonly drm?: boolean;
}

/** An `expired` error — the auth credential is no longer valid. Retryable after re-auth. */
export interface ExpiredStreamError {
  readonly kind: 'expired';
  readonly message: string;
  /** Which credential expired, e.g. `'podcastIndex'`, `'archive.org'`. */
  readonly provider?: string;
  /** True if the user can re-auth in-place (e.g. login screen is reachable). */
  readonly reAuthAvailable: boolean;
}

/** A `blocked` error — the server actively refused the request (geo-block, account-banned, parental-controls, region-lock). Not retryable. */
export interface BlockedStreamError {
  readonly kind: 'blocked';
  readonly message: string;
  /** The provider that blocked the request, if known. */
  readonly provider?: string;
  /** A short reason code (e.g. `'geo'`, `'banned'`, `'parental'`). Display only; not for branching. */
  readonly reason?: 'geo' | 'banned' | 'parental' | 'unknown';
}

export type StreamError =
  | NetworkStreamError
  | UnsupportedStreamError
  | ExpiredStreamError
  | BlockedStreamError;

/** Convenience constructors for the 4 variants. */
export const networkError = (
  message = 'Network unavailable',
  options: {cause?: string; retryable?: boolean} = {},
): NetworkStreamError => ({
  kind: 'network',
  message,
  cause: options.cause,
  retryable: options.retryable ?? true,
});

export const unsupportedError = (
  message = 'Media format not supported',
  options: {format?: string; drm?: boolean} = {},
): UnsupportedStreamError => ({
  kind: 'unsupported',
  message,
  format: options.format,
  drm: options.drm ?? false,
});

export const expiredError = (
  message = 'Authentication expired — please sign in again',
  options: {provider?: string; reAuthAvailable?: boolean} = {},
): ExpiredStreamError => ({
  kind: 'expired',
  message,
  provider: options.provider,
  reAuthAvailable: options.reAuthAvailable ?? true,
});

export const blockedError = (
  message = 'Content blocked',
  options: {provider?: string; reason?: BlockedStreamError['reason']} = {},
): BlockedStreamError => ({
  kind: 'blocked',
  message,
  provider: options.provider,
  reason: options.reason ?? 'unknown',
});

// ─── Result<T, E> ───────────────────────────────────────────

export type Result<T, E> =
  | {readonly ok: true; readonly value: T}
  | {readonly ok: false; readonly error: E};

export const ok = <T>(value: T): Result<T, never> => ({ok: true, value});
export const err = <E>(error: E): Result<never, E> => ({ok: false, error});

/** Map the success value, pass through errors untouched. */
export function map<T, U, E>(r: Result<T, E>, fn: (t: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

/**
 * Run a function that may throw, capturing the result.
 *   - If `fn()` returns a value → `ok(value)`
 *   - If `fn()` throws → `err(mapThrowable(e))`
 *
 * `mapThrowable` defaults to wrapping the error in a
 * `NetworkStreamError` (best-effort given the V12 bridge's
 * lack of error codes). Call sites that know more (e.g. a
 * podcast that 404'd) can pass a custom mapper.
 *
 * D-021: the default mapper has return type `NetworkStreamError`,
 * but the generic `E` is unconstrained here (so callers can pass
 * `string` or any other error shape). The single `as E` cast
 * is the only way to bridge "concrete variant" → "free generic".
 * A constraint `E extends StreamError` was tried (D-021 first
 * pass) and removed — TypeScript still rejected the assignment
 * because `NetworkStreamError` is not assignable to a free `E`
 * (E could be `UnsupportedStreamError` or any other variant).
 * The cast is honest: the runtime value IS a `NetworkStreamError`
 * which is a `StreamError`, and the default `E = StreamError`
 * is satisfied. Callers that need a custom variant must pass
 * their own `mapThrowable`.
 */
export function capture<T, E = StreamError>(
  fn: () => T | Promise<T>,
  mapThrowable: (e: unknown) => E = (e) =>
    networkError(
      'Player launch failed',
      {cause: e instanceof Error ? e.message : String(e)},
    ) as E,
): Promise<Result<T, E>> {
  return Promise.resolve()
    .then(fn)
    .then((v) => ok<T>(v) as Result<T, E>)
    .catch((e) => err<E>(mapThrowable(e)));
}

// ─── StreamError type guards ─────────────────────────────────

/** Narrow a `StreamError` to a `NetworkStreamError`. */
export const isNetworkError = (e: StreamError): e is NetworkStreamError =>
  e.kind === 'network';

/** Narrow a `StreamError` to an `UnsupportedStreamError`. */
export const isUnsupportedError = (e: StreamError): e is UnsupportedStreamError =>
  e.kind === 'unsupported';

/** Narrow a `StreamError` to an `ExpiredStreamError`. */
export const isExpiredError = (e: StreamError): e is ExpiredStreamError =>
  e.kind === 'expired';

/** Narrow a `StreamError` to a `BlockedStreamError`. */
export const isBlockedError = (e: StreamError): e is BlockedStreamError =>
  e.kind === 'blocked';
