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
 * Returns the resume position in **milliseconds** for the given id,
 * or `undefined` if no saved position exists. See the module
 * docstring for the priority order (bookmark first, history fallback).
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
    return Math.round(historyEntry.position * 1000);
  }

  // 3. No saved position — `useOpenWithResume` will fall back to
  //    the consumer-provided `startPositionMs` (or 0).
  return undefined;
}
