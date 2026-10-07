/**
 * W9.4 — the shared vocabulary for "which media is this, and is it worth
 * resuming?".
 *
 * ## Why one module
 *
 * The resume **reader** (`resumePolicy.ts`) and the resume **writer**
 * (`usePlaybackCheckpointSync.ts`) sit at opposite ends of a chain that
 * has now been joined for the first time. Two of them agreeing on a rule
 * by coincidence is the same defect as two sources of truth for one
 * field: it works until one side is edited. Every predicate and constant
 * that both sides need lives here exactly once.
 *
 * ## Identity: why the URI is the key
 *
 * The obvious best-practice answer is a provider id (WatchState, the
 * cross-server sync engine, documents its matching priority as
 * "Provider IDs (TMDB, TVDB, IMDB) — most reliable; Title + Year —
 * fallback; File path — last"). SIMBA cannot use that today, and the
 * honest reason is worth recording:
 *
 *   - No `providerId` exists anywhere in the domain types
 *     (`MediaItem` / `MediaFile` carry `uri`, `title`, `source`, `type`,
 *     `mediaType`, `provider`, `folderId` — that is all).
 *   - `provider` is declared but **never assigned**: no adapter sets it,
 *     and `classifyApiMedia` / `classifyLocalMedia` in `types/media.ts`
 *     have zero call sites.
 *   - The Internet Archive adapter *does* receive a stable
 *     `metadata.identifier` and drops it before it becomes a `MediaItem`.
 *
 * So provider-ID matching is not "not done yet" — it is not available.
 * Inventing a synthetic id to satisfy the pattern would be the exact
 * jugaad this codebase is being cleared of.
 *
 * **The URI is nevertheless the correct key here, not a fallback:**
 *
 *   - A local file has exactly one URI. Two files of the same film are
 *     two genuinely different items and *should* be two shelf entries —
 *     merging them by title would be a bug, not a feature (remakes).
 *   - API items are content-addressed: an Internet Archive stream is
 *     `.../download/<identifier>/<file>`, so the identifier is already
 *     inside the URL.
 *   - The same film existing as both a local file and a streamed item is
 *     two different things, and Netflix keeps those separate too.
 *
 * What genuinely *does* cause phantom duplicates is URI **spelling** —
 * `file:///storage/...` vs `/storage/...`, percent-encoding, fragments,
 * trailing slashes. That is what `normalizeMediaUri` removes.
 */

/**
 * Canonical, comparable form of a media URI.
 *
 * Collapses the spellings that produce phantom duplicates without
 * touching anything that could identify different media:
 *
 *   - `file:///a/b.mkv` and `/a/b.mkv` (React Native accepts both; the
 *     same file, two entries in the shelf).
 *   - Percent-encoding of otherwise-plain characters (`%20` vs a space).
 *   - A `#fragment`, which never identifies a different media file.
 *   - Duplicate and trailing slashes in the path.
 *
 * Deliberately NOT normalized: query strings, host, and scheme. A
 * `?quality=low` stream is a different resource and, on this app's
 * single-file launch path, a genuinely different item.
 */
export function normalizeMediaUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return '';

  // Drop the fragment. Nothing in this app plays a mid-file fragment,
  // so it can only ever be a difference in spelling.
  const withoutFragment = trimmed.split('#')[0];

  // React Native accepts a bare absolute path as equivalent to a
  // `file://` URI. Fold the bare form onto the URI form so the two
  // spellings collapse onto one shelf entry.
  const withScheme = /^file:\/\//i.test(withoutFragment)
    ? withoutFragment
    : withoutFragment.startsWith('/')
      ? `file://${withoutFragment}`
      : withoutFragment;

  let decoded = withScheme;
  try {
    // Only decode characters that are genuinely equivalent spellings.
    // A literal `%` that is not a valid escape is left alone so a file
    // literally named `100%.mp3` does not throw or lose data.
    decoded = decodeURI(withScheme);
  } catch {
    decoded = withScheme;
  }

  // Collapse repeated slashes and strip a trailing one — but ONLY in
  // the path. A blanket `replace(/\/{2,}/g, '/')` over the whole string
  // eats the scheme's own `//`, turning `file:///a/b.mkv` into
  // `file:/a/b.mkv`, which is a different (and invalid) URI. Splitting
  // the scheme off first is what makes this safe.
  const schemeMatch = /^([a-z][a-z0-9+.-]*:\/\/)([\s\S]*)$/i.exec(decoded);
  if (!schemeMatch) return decoded.replace(/\/+$/, '');

  const [, scheme, rest] = schemeMatch;
  const path = rest.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return `${scheme}${path}`;
}

/**
 * The identity a shelf entry, a resume lookup and a bookmark all share.
 *
 * Two launches produce the same key exactly when they are the same
 * playable thing. That makes "did I play this already?" a single string
 * comparison instead of a rule duplicated across three stores.
 */
export function mediaKey(uri: string): string {
  return normalizeMediaUri(uri);
}

// ─── Completion ──────────────────────────────────────────────

/**
 * Fraction of a title past which it counts as finished.
 *
 * Two independent shipping players document 90% as their default:
 * Plex ("Video played threshold") and Jellyfin ("Maximum resume
 * percentage" — past which the item is marked played and the position
 * resets).
 *
 * Below this, resuming is right. At or above it, resuming drops the user
 * into the last seconds of the credits — the worst outcome resume can
 * produce, and the one that makes people turn the feature off rather
 * than notice it.
 */
export const RESUME_MAX_FRACTION = 0.9;

/**
 * True when `positionSec` is far enough into `durationSec` that the
 * user has effectively finished it.
 *
 * An unknown duration (`0`) is never "finished": we have no basis for
 * the claim. A live stream and a file mpv has not measured yet are both
 * `duration 0`, and inventing a verdict for either would be a lie.
 */
export function isEffectivelyFinished(
  positionSec: number,
  durationSec: number,
): boolean {
  if (!(durationSec > 0)) return false;
  return positionSec / durationSec >= RESUME_MAX_FRACTION;
}

// ─── Checkpoint admission ────────────────────────────────────

/**
 * How often a playing session writes a resume checkpoint.
 *
 * The history store is **persisted to MMKV**, so this is a storage write,
 * not a memory write: 1 Hz would mean a synchronous-ish serialise and
 * flush every second for the whole runtime. 30 s is the interval Netflix
 * documents for its own playback-position store.
 *
 * The window this accepts: a user who force-quits loses up to 30 s of
 * position, and every shipping player has the same window.
 */
export const CHECKPOINT_INTERVAL_MS = 30_000;

/**
 * Below this many seconds, a "playback" is treated as a tap, not a
 * viewing, and produces no shelf entry.
 *
 * A user who opens something and immediately backs out did not watch
 * it, and an entry for it would push everything they actually care
 * about further down a 20-slot list. 5 s is short enough that a genuine
 * mis-tap is the only thing it filters out.
 *
 * Distinct from "in progress": `isInProgress` in the Home rail uses 30 s
 * to decide whether to draw a "time left" badge, which is a display
 * question about a real entry. This is an admission question about
 * whether an entry should exist at all.
 */
export const MIN_CHECKPOINT_POSITION_SEC = 5;

/**
 * Size of the frame captured for the continue-watching rail.
 *
 * These live here, next to the checkpoint rule, rather than at the two
 * ends that use them, so the writer cannot start capturing a size the
 * card cannot show well (and neither can silently disagree with the
 * library's own defaults).
 *
 * 640x360 is 16:9, matching `MediaRailCard`'s 160x90 thumbnail, so the
 * captured picture fills the card with no letterboxing — which would
 * otherwise crop to a stripe across the middle of the frame.
 */
export const RESUME_THUMB_WIDTH = 640;
export const RESUME_THUMB_HEIGHT = 360;

export interface CheckpointAdmissionInput {
  /** Session position in **seconds**. */
  readonly positionSec: number;
  /** Session duration in **seconds**. `0` means unknown / live. */
  readonly durationSec: number;
}

/**
 * Whether a playback tick is worth persisting as a resume checkpoint.
 *
 * Deliberately returns `false` for an unknown duration. A live TV
 * channel and a radio stream both report `duration 0`; recording a
 * "position" against one produces a shelf entry that, if resumed, joins
 * the user mid-broadcast at a position that means nothing. **No
 * duration, no resume marker** — while still allowing the item to appear
 * in a purely recency-ordered list, which is the caller's job.
 */
export function shouldRecordCheckpoint(
  input: CheckpointAdmissionInput,
): boolean {
  if (!(input.durationSec > 0)) return false;
  if (!(input.positionSec >= MIN_CHECKPOINT_POSITION_SEC)) return false;
  return true;
}