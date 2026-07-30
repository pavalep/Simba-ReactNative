/**
 * Shared type for per-screen `textContent.ts` default exports.
 *
 * Every screen folder should export a `const textContent = { ... } as const`
 * matching `TextContent` — a record of string keys → literal string values.
 *
 * Usage:
 * ```ts
 * import textContent from './textContent';
 * // typeof textContent.key  →  string literal, e.g. "Play All"
 * ```
 */
export type TextContent = Record<string, string | readonly string[]>;
