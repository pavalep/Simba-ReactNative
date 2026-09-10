// ─── V21 W6 P21 (D-024 / D-025 partly) — Adapter error types ─────────
//
// The 10 remote-data adapters in `src/infrastructure/api/<provider>/`
// all return a typed domain object. If the wire payload doesn't
// match the expected shape (truncated response, upstream API
// breaking change, malicious payload), the adapter throws a
// typed `AdapterParseError` instead of letting the `null`/
// `undefined` flow downstream and crash in a render.
//
// V18 ideal: no new dep. Hand-rolled type guards are sufficient —
// each adapter knows its wire shape, the guards are ~10 lines
// each, and the test coverage is per-adapter. A schema library
// (valibot / zod) would add a dep + ceremony for marginal value.
//
// Why not extend `ApiError`: `ApiError` carries an HTTP `status`
// field. `AdapterParseError` carries a `path` field (the JSON
// path that failed validation). They're orthogonal failure modes
// (transport-level vs shape-level) and should be distinguishable
// in catch blocks.

/**
 * Thrown by an adapter when the wire payload doesn't match the
 * expected shape. The `path` is a human-readable description of
 * which field failed (e.g. `'feed.id'`, `'items[0].duration'`),
 * not a JSONPath expression — keep it simple for log output.
 *
 * Use `error.name === 'AdapterParseError'` to discriminate from
 * `ApiError` / generic `Error in a catch block.
 */
export class AdapterParseError extends Error {
  readonly provider: string;
  readonly path: string;

  constructor(
    provider: string,
    path: string,
    message: string,
  ) {
    super(`[${provider}] ${path}: ${message}`);
    this.name = 'AdapterParseError';
    this.provider = provider;
    this.path = path;
  }
}

// ─── Generic type guard helpers ───────────────────────────────────────
//
// The 10 adapters use these primitives in their `parseWireShape`
// functions. Keeping them here (vs duplicated per-adapter) means
// the validation pattern is uniform and a future contributor
// can extend one file when a new shape appears (e.g. tagged
// unions).

/**
 * Type guard: `value` is a plain object (not null, not array).
 */
export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard: `value` is a finite number (not NaN, not Infinity).
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Type guard: `value` is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard: `value` is a string. Empty strings are allowed
 * (some APIs return `""` for missing optional fields).
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard: `value` is an array.
 *
 * The element shape is intentionally `unknown` — adapters should
 * narrow further per-item (e.g. with `items.every(isFoo)`). This
 * helper is just the cheap outer-array check.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Assert that `value` matches a type guard. On failure, throws
 * `AdapterParseError` with the given path + provider.
 *
 * ```ts
 * const items = assertShape(raw, 'items', 'podcastIndex', isArray);
 * ```
 */
export function assertShape<T>(
  value: unknown,
  path: string,
  provider: string,
  guard: (v: unknown) => v is T,
  message?: string,
): T {
  if (guard(value)) return value;
  throw new AdapterParseError(
    provider,
    path,
    message ?? describe(value),
  );
}

/**
 * Assert that `value` is `T` (no type guard — uses a predicate).
 * Useful when the guard returns `boolean` (e.g. for custom
 * discriminated unions).
 */
export function assert<T>(
  value: unknown,
  path: string,
  provider: string,
  predicate: (v: unknown) => boolean,
  message?: string,
): T {
  if (predicate(value)) return value as T;
  throw new AdapterParseError(
    provider,
    path,
    message ?? describe(value),
  );
}

/** Compact human-readable description for error messages. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') return 'object';
  return `${typeof value} (${JSON.stringify(value)})`;
}