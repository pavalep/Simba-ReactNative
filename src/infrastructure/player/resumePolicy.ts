/**
 * V21 W22 F/U #2 — pure helper for the resume policy.
 *
 * `<SimbaPlayer resumePolicy={fn}>` (V16, the one-import-one-wrapper
 * root) wraps the app with a `<PlayerResumeProvider>`. The policy
 * function is called synchronously at every `useOpenWithResume`
 * `.openPlayer({resumeId})` call site, returning the saved resume
 * position in **milliseconds** (the bridge's `startPositionMs` shape)
 * or `undefined` for "no saved position — start from 0".
 *
 * This module extracts the body of that policy into a **pure**
 * function so the resume-lookup logic can be unit-tested without
 * mounting the App.tsx root. The App.tsx glue just reads the two
 * Zustand stores and passes them in:
 *
 * ```ts
 * // App.tsx
 * const resumePolicy = (resumeId: string) => {
 *   const bookmarks = useBookmarksStore.getState().items;
 *   const history   = useRecentHistoryStore.getState().entries;
 *   return resolveResumeMs({bookmarks, history}, resumeId);
 * };
 * ```
 *
 * **Priority** (the V21 choice, after the F/U #1 typed-play work):
 *
 *   1. **Bookmarks first.** Bookmarks are an explicit user signal
 *      ("I want to come back to this exact moment"). If a bookmark
 *      exists for the id, use the LATEST (most recently created)
 *      one — bookmarks are `(fileUri, position)`-hashed, so
 *      multiple positions can exist per URI.
 *   2. **History fallback.** Playback history is the implicit
 *      signal ("I was just listening to this"). 1 entry per fileUri
 *      (upsert on each play), so `find` is sufficient.
 *   3. **`undefined` if neither** — `useOpenWithResume` falls back
 *      to 0 (or the consumer-provided `startPositionMs`).
 *
 * **Position conversion:** both stores persist `position` in
 * **seconds** (per the per-field JSDoc on `Bookmark.position` and
 * `RecentHistoryEntry.position`); the bridge field is in
 * **milliseconds**. The helper multiplies by 1000 and rounds to
 * the nearest ms.
 *
 * **Why a pure helper and not a hook:** the policy function must
 * be synchronous (the module calls it inline). A hook would force
 * a re-render every time the bookmarks/history arrays change —
 * wasteful since the policy is only read at `openPlayer` time, not
 * during render. A pure helper + App-level `useBookmarksStore.getState()`
 * / `useRecentHistoryStore.getState()` reads gives us testability
 * without a re-render storm.
 */

import type {Bookmark} from '../../state/bookmarksStore';
import type {RecentHistoryEntry} from '../../state/recentHistoryStore';

export interface ResumeLookupInput {
  /** Bookmarks from `useBookmarksStore.getState().items`. Read-only. */
  readonly bookmarks: readonly Bookmark[];
  /** History from `useRecentHistoryStore.getState().entries`. Read-only. */
  readonly history: readonly RecentHistoryEntry[];
}

/**
 * V19 W9.3 — the "already finished" cutoff, as a fraction of duration.
 *
 * Two independent shipping players agree on this number:
 *
 *   - **Plex** — Settings > Library > "Video played threshold".
 *     Documented default: **90%**.
 *   - **Jellyfin** — Dashboard > Playback > Resume > "Maximum resume
 *     percentage". Documented default: **90%**; past it the item is
 *     marked played and the position resets.
 *
 * Without the cutoff, finishing a film and tapping it again opens it
 * on the last credits frame, plays a few seconds and stops — the worst
 * outcome resume can produce, and the one that makes users turn the
 * feature off rather than notice it exists.
 *
 * Jellyfin also refuses to save a position for anything shorter than
 * 300s. That rule is deliberately NOT copied here: it is
 * single-sourced, and SIMBA's library is full of short podcast
 * episodes where resuming 20 seconds in is exactly right. The 90%
 * ceiling already covers the genuinely-broken case.
 */
export const RESUME_MAX_FRACTION = 0.9;

/**
 * True when `positionSec` is far enough into `durationSec` that the
 * user has effectively finished it.
 *
 * An unknown duration (`0`) can never be "near the end" — we have no
 * basis to call it finished, so the position is trusted as-is. This
 * is the same reasoning as the `> 0` guards below: a missing value is
 * not evidence.
 */
function isEffectivelyFinished(positionSec: number, durationSec: number): boolean {
  if (!(durationSec > 0)) return false;
  return positionSec / durationSec >= RESUME_MAX_FRACTION;
}

/**
 * Returns the resume position in **milliseconds** for the given id,
 * or `undefined` if no saved position exists. See the module
 * docstring for the priority order (bookmark first, history fallback).
 *
 * **Bookmarks bypass the finished-check; history does not.** That
 * asymmetry is the point, not an oversight:
 *
 *   - A **bookmark** is an explicit instruction — "come back to this
 *     exact moment". A user who bookmarked 58:00 of a 60:00 film and
 *     taps that bookmark wants 58:00. Applying a heuristic that
 *     overrides the instruction they actually gave is worse than the
 *     heuristic it would protect against.
 *   - **History** is an implicit continuation signal, and it is the
 *     one that produces the "it replayed the last 3 seconds" bug. So
 *     it is the one the cutoff applies to.
 *
 * (See `RESUME_MAX_FRACTION` for the Plex/Jellyfin provenance of the
 * 90% value.)
 */
export function resolveResumeMs(
  input: ResumeLookupInput,
  id: string,
): number | undefined {
  // 1. Bookmarks (explicit user signal). Multiple positions per URI
  //    are allowed (A14: each id encodes `(fileUri, position)`) so
  //    we take the LATEST — the most recently created wins, since
  //    that's the "freshest" explicit signal.
  const matches = input.bookmarks.filter(b => b.fileUri === id);
  if (matches.length > 0) {
    const latest = matches.reduce<Bookmark | null>(
      (acc, b) => (acc && acc.createdAt > b.createdAt ? acc : b),
      null,
    );
    if (latest && latest.position > 0) {
      return Math.round(latest.position * 1000);
    }
  }

  // 2. History (implicit recent-play signal). The history store
  //    upserts on every play, so at most 1 entry per fileUri —
  //    `find` is sufficient.
  const historyEntry = input.history.find(h => h.fileUri === id);
  if (historyEntry && historyEntry.position > 0) {
    // Past RESUME_MAX_FRACTION the user has finished this; treat it
    // as "no saved position" so the launch starts from the top.
    if (isEffectivelyFinished(historyEntry.position, historyEntry.duration)) {
      return undefined;
    }
    return Math.round(historyEntry.position * 1000);
  }

  // 3. No saved position — `useOpenWithResume` will fall back to
  //    the consumer-provided `startPositionMs` (or 0).
  return undefined;
}
