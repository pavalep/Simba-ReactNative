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
import {isEffectivelyFinished, mediaKey} from './playbackProgress';

export interface ResumeLookupInput {
  /** Bookmarks from `useBookmarksStore.getState().items`. Read-only. */
  readonly bookmarks: readonly Bookmark[];
  /** History from `useRecentHistoryStore.getState().entries`. Read-only. */
  readonly history: readonly RecentHistoryEntry[];
}

/**
 * The "already finished" cutoff lives in `./playbackProgress` now, next
 * to the other half of the contract.
 *
 * W9.4 moved it: the resume **reader** (this file) and the resume
 * **writer** (`usePlaybackCheckpointSync`) sit at opposite ends of a
 * chain that had never been joined. Two copies of the 90% rule that
 * agree by coincidence is the same defect as two sources of truth for
 * one field — it holds until somebody edits one side. Re-exported here
 * because callers already import it from this module.
 */
export {RESUME_MAX_FRACTION, isEffectivelyFinished} from './playbackProgress';

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
  // W9.4: every comparison goes through `mediaKey`, so a bookmark saved
  // as `/a/b.mkv` still matches a shelf entry stored as
  // `file:///a/b.mkv`. Before this, a single URI spelling difference
  // silently produced "no saved position" — a resume that looked like
  // it had simply never worked.
  const key = mediaKey(id);

  // 1. Bookmarks (explicit user signal). Multiple positions per URI
  //    are allowed (A14: each id encodes `(fileUri, position)`) so
  //    we take the LATEST — the most recently created wins, since
  //    that's the "freshest" explicit signal.
  const matches = input.bookmarks.filter(b => mediaKey(b.fileUri) === key);
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
  const historyEntry = input.history.find(h => mediaKey(h.fileUri) === key);
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
