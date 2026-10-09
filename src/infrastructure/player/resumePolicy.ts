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
export function resolveResumeCandidate(
  input: ResumeLookupInput,
  id: string,
): ResumeCandidate | null {
  const key = mediaKey(id);

  // 1. Bookmarks — explicit user signal, wins outright.
  const matches = input.bookmarks.filter(b => mediaKey(b.fileUri) === key);
  if (matches.length > 0) {
    const latest = matches.reduce<Bookmark | null>(
      (acc, b) => (acc && acc.createdAt > b.createdAt ? acc : b),
      null,
    );
    if (latest && latest.position > 0) {
      return {
        positionMs: Math.round(latest.position * 1000),
        source: 'bookmark',
        title: latest.title,
        // Conditional spreads, not `|| undefined` — the candidate's
        // artwork fields are optional and a key that is present with
        // value `undefined` still reads as "this record has artwork" to
        // anything doing `'thumbnailPath' in candidate`.
        ...(latest.thumbnailPath ? {thumbnailPath: latest.thumbnailPath} : {}),
      };
    }
  }

  // 2. History — implicit continuation, subject to the finished cutoff.
  const entry = input.history.find(h => mediaKey(h.fileUri) === key);
  if (entry && entry.position > 0 && !isEffectivelyFinished(entry.position, entry.duration)) {
    return {
      positionMs: Math.round(entry.position * 1000),
      source: 'history',
      title: entry.title,
      // The captured-at-the-resume-position frame wins over poster
      // artwork: it is the picture of *where you left off*, which is what
      // a resume card is actually selling.
      ...(entry.resumeThumbnailPath
        ? {resumeThumbnailPath: entry.resumeThumbnailPath}
        : {}),
      ...(entry.thumbnailPath ? {thumbnailPath: entry.thumbnailPath} : {}),
    };
  }

  return null;
}

/**
 * The resume position in **milliseconds**, or `undefined` when nothing is
 * saved.
 *
 * Thin wrapper over {@link resolveResumeCandidate} so there is exactly ONE
 * implementation of the priority rules. A second copy here would be the
 * same defect as two copies of `RESUME_MAX_FRACTION`: correct today,
 * divergent the first time either side is edited.
 */
export function resolveResumeMs(
  input: ResumeLookupInput,
  id: string,
): number | undefined {
  return resolveResumeCandidate(input, id)?.positionMs;
}

// ─── The launch-time decision ────────────────────────────────────

/**
 * A resume position that could be offered to the user, with enough
 * context to write the prompt.
 *
 * `source` is not decoration — the prompt is worded differently for an
 * explicit bookmark ("continue from where you marked") than for an
 * implicit history position, because they are different kinds of signal
 * and conflating them would be a lie about where the number came from.
 */
export interface ResumeCandidate {
  /** Milliseconds — the bridge's shape. */
  readonly positionMs: number;
  readonly source: 'bookmark' | 'history';
  /** Title of the saved record, for the prompt's message line. */
  readonly title: string;
  /**
   * Artwork for the resume card — the title's own image, or a frame
   * captured at the resume position.
   *
   * Optional because neither record is guaranteed to carry one: a row
   * written before artwork was threaded through, or a first play where no
   * frame has been captured yet. The card renders title-only when absent,
   * which is a truthful fallback rather than a placeholder.
   *
   * A remote URL and a local file path both arrive here, and both work:
   * the card renders through `{uri}`.
   */
  readonly thumbnailPath?: string;
  /** A frame captured at the resume position. Wins over `thumbnailPath`. */
  readonly resumeThumbnailPath?: string;
}

/** What the user chose when asked. */
export type ResumeChoice = 'resume' | 'start';

export type ResumePlan =
  /** The caller already decided. Forwarded verbatim, never questioned. */
  | {readonly kind: 'explicit'; readonly startPositionMs: number}
  /** A saved position exists and a prompt is available: ask. */
  | {readonly kind: 'prompt'; readonly candidate: ResumeCandidate}
  /** Nothing saved, or no prompt wired: resume silently if possible. */
  | {readonly kind: 'auto'; readonly startPositionMs: number};

export interface PlanResumeInput {
  /**
   * A `startPositionMs` the CALLER passed, including `0`.
   *
   * `0` counts as explicit, and that is load-bearing: it is how "start
   * from the beginning" is expressed. The lib gates its own policy on
   * `providedStartMs == null` (`useOpenWithResume.tsx:128`), so an
   * explicit zero suppresses resume — and an implicit zero would not.
   */
  readonly explicitStartMs: number | undefined;
  readonly candidate: ResumeCandidate | null;
  /** Whether a UI prompt is actually available in this tree. */
  readonly prompt: boolean;
}

/**
 * Decide how a launch should be resolved, before anything opens.
 *
 * ## Why the prompt is not unconditional
 *
 * An explicit `startPositionMs` means the caller already made the choice
 * — the Song screen jumping to a bookmark the user tapped, or a caller
 * deliberately restarting. Asking again would be asking the same
 * question twice, and the second dialog would contradict the first.
 *
 * ## Why `prompt: false` still resumes
 *
 * A missing prompt provider degrades to the Netflix/YouTube behaviour
 * (resume silently), never to "never resume". Losing the prompt is a
 * presentation regression; losing resume would be a functional one, and
 * the caller would have no way to tell.
 */
export function planResume(input: PlanResumeInput): ResumePlan {
  if (input.explicitStartMs !== undefined) {
    return {kind: 'explicit', startPositionMs: input.explicitStartMs};
  }
  if (input.candidate && input.prompt) {
    return {kind: 'prompt', candidate: input.candidate};
  }
  return {kind: 'auto', startPositionMs: input.candidate?.positionMs ?? 0};
}

/**
 * Collapse a plan (and the answer, if one was asked for) into the single
 * number the bridge wants.
 *
 * "Start from beginning" becomes an explicit `0` on purpose: it must
 * suppress the lib's policy rather than merely omit a position, or the
 * policy would resume the very thing the user just declined to resume.
 */
export function resolvePlanStartMs(
  plan: ResumePlan,
  choice?: ResumeChoice,
): number {
  if (plan.kind === 'prompt') {
    return choice === 'resume' ? plan.candidate.positionMs : 0;
  }
  return plan.startPositionMs;
}

