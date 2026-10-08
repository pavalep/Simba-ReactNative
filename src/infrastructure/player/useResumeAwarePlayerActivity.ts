/**
 * V19 W9.3 — resume-aware launch seam.
 *
 * @see the `usePlayerActivity` wrapper in `./index.ts` for the full
 * account of the defect this fixes. That docblock is the canonical
 * one; this file exists only so `./index.ts` and `./playbackFacade.ts`
 * can share ONE implementation without importing each other
 * (`playbackFacade` is already imported by `index.ts` for the
 * `PlaybackId` type, so the reverse edge would be a runtime cycle).
 */

import React, {useMemo} from 'react';
import {
  useOpenWithResume,
  usePlayerActivity as useLibPlayerActivity,
} from '@simba-dev/react-native-media-player';
import type {
  OpenPlayerOptions,
  UsePlayerActivityResult,
} from '@simba-dev/react-native-media-player';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
// Imported from the concrete store modules rather than the `state`
// barrel: `resumePolicy` already depends on those two types, and the
// barrel re-exports enough of the app that routing through it here
// would put a cycle (`state/index` -> ... -> `infrastructure/player`)
// on the seam's import graph for no benefit.
import {useBookmarksStore} from '../../state/bookmarksStore';
import {useRecentHistoryStore} from '../../state/recentHistoryStore';
import {
  planResume,
  resolvePlanStartMs,
  resolveResumeCandidate,
  type ResumeCandidate,
  type ResumeChoice,
} from './resumePolicy';

/**
 * Extra identity a launching screen can supply, beyond what the bridge
 * needs.
 *
 * The bridge only wants `uri` / `title` / `type` / `startPositionMs`.
 * These fields exist so the resume + "Recently Played" chain can write a
 * shelf entry that actually looks like the thing the user tapped —
 * with its artwork, its lane, its catalogue name — instead of a row of
 * bare titles.
 *
 * Entirely optional. A caller that has only a URI (the file picker, a
 * deep link) passes nothing and still resumes correctly; the entry just
 * carries less metadata.
 */
export interface LaunchIdentity {
  /**
   * Semantic kind from the catalogue, e.g. `'movie'`.
   *
   * Named `mediaKind`, NOT `type`, and that is deliberate: the bridge's
   * `OpenPlayerOptions.type` is the REQUIRED `'video' | 'audio'` stream
   * type. Naming the semantic kind `type` too meant destructuring it off
   * silently removed a field the bridge still required — `tsc` caught it,
   * but only because this seam is the one place the collision exists.
   */
  mediaKind?: NowPlayingKind;
  /** Playback lane. Keeps audio and video shelves independent. */
  mediaLane?: 'audio' | 'video';
  /** Catalogue / provider name, when the screen knows it. */
  provider?: string;
  /** Artwork URI, when the screen has one. */
  thumbnailPath?: string;
}

type NowPlayingKind = NonNullable<
  import('../../state/nowPlayingStore').NowPlaying['type']
>;

/** The launch shape the app's seam accepts: bridge options + optional identity. */
export type AppOpenPlayerOptions = OpenPlayerOptions & LaunchIdentity;

/**
 * The lib's result type, with `openPlayer` widened to accept the app's
 * own identity fields.
 *
 * This widening is not cosmetic. While the seam was typed with the
 * lib's `UsePlayerActivityResult`, `openPlayer` accepted
 * `OpenPlayerOptions` alone — so `mediaLane` / `mediaKind` /
 * `thumbnailPath` were a type error at every one of the ~34 call sites.
 * The fields existed, the seam destructured them, and nothing could
 * pass them without a cast. That is why every launch arrived
 * unclassified, why the history store defaulted to the audio lane, and
 * why films rendered with a music badge.
 */
export type AppPlayerActivityResult = Omit<UsePlayerActivityResult, 'openPlayer'> & {
  openPlayer: (opts: AppOpenPlayerOptions) => Promise<boolean>;
};

/**
 * Asks the user what to do about a saved position.
 *
 * Reached through {@link ResumePromptContext} rather than a per-call
 * argument, because this hook is called from ~34 screens. A prompt
 * passed as a parameter would be opt-in per screen, and the one screen
 * that forgets it silently loses the choice — the exact failure the seam
 * exists to prevent. A context provider at the app root makes the
 * choice universal.
 *
 * The callback lives in `App.tsx` (it needs a `Dialog`), so this module
 * stays free of UI and a unit test can supply a plain function.
 */
export type PromptResume = (candidate: ResumeCandidate) => Promise<ResumeChoice>;

/**
 * `undefined` means "no prompt wired" and resumes silently. It is NOT
 * a way to disable resume — an explicit `startPositionMs: 0` is.
 */
export const ResumePromptContext = React.createContext<PromptResume | undefined>(
  undefined,
);

/**
 * Per-call override, for a screen that deliberately wants a different
 * prompt (or none) for one launch. Rare enough that the common path is
 * the context.
 */
export interface UsePlayerActivityOptions {
  readonly promptResume?: PromptResume;
}

/**
 * `usePlayerActivity` with resume resolved — and, when a prompt is
 * available, asked about — by default.
 *
 * Replaces the lib's pass-through hook for every app call site. See
 * `./index.ts` for why resume belongs at this seam rather than at 34
 * screens, and `resumePolicy.ts` for what the policy actually does.
 *
 * Behaviour contract:
 *   - `resumeId` is the media `uri` (the app's resume key everywhere —
 *     the policy matches on `Bookmark.fileUri` /
 *     `RecentHistoryEntry.fileUri`).
 *   - The seam ALWAYS sends an explicit `startPositionMs`. That is what
 *     makes it the single authority: the lib's own `resumePolicy` lookup
 *     is gated on `providedStartMs == null`
 *     (`useOpenWithResume.tsx:128`), so an always-present value means
 *     two resume rules can never disagree about the same launch.
 *   - An explicit caller position still wins untouched — including `0`,
 *     which is how "start over" is expressed and what suppresses the
 *     lib's policy.
 *   - W9.5: when a saved position exists and a prompt is wired, the user
 *     is asked (Plex: "Resume" / "From the beginning"; VLC: "Continue
 *     playback?"). Previously four screens each re-implemented resume
 *     by passing a store position — in SECONDS — into a MILLISECOND
 *     field, which both broke by 1000x and silently bypassed this
 *     policy on every launch.
 *   - The launch is recorded in `useNowPlayingStore`. The lib cannot
 *     tell us which file a single-file launch is playing (its
 *     `currentUri` comes from the queue, which `openPlayer` does not
 *     populate), so the seam — which was handed the URI — is the only
 *     place that can publish it. `usePlaybackCheckpointSync` reads it
 *     to write resume checkpoints.
 */
export function usePlayerActivity(
  options: UsePlayerActivityOptions = {},
): AppPlayerActivityResult {
  const {getLaunchParams} = useLibPlayerActivity();
  const openWithResume = useOpenWithResume();
  const beginSession = useNowPlayingStore(s => s.begin);
  const endSession = useNowPlayingStore(s => s.end);
  const contextPrompt = React.useContext(ResumePromptContext);
  const promptResume = options.promptResume ?? contextPrompt;

  return useMemo<AppPlayerActivityResult>(
    () => ({
      openPlayer: async (opts: AppOpenPlayerOptions) => {
        // Identity fields are ours; the bridge must not see most of them,
        // so they are destructured off before delegating. Forwarding an
        // unknown key across the bridge is how argument-shape drift
        // starts. `type` is deliberately NOT destructured — it belongs
        // to the bridge and is required there.
        //
        // `thumbnailPath` is the exception: it becomes the media
        // notification's artwork on the audio path, which now runs
        // without a window. Nothing else would put an image on the
        // notification, because before V20 that was `PlayerActivity`'s
        // job and it was hardcoded to an empty string.
        const {mediaKind, mediaLane, provider, thumbnailPath, ...bridgeOpts} = opts;

        const candidate = resolveResumeCandidate(
          {
            bookmarks: useBookmarksStore.getState().items,
            history: useRecentHistoryStore.getState().entries,
          },
          bridgeOpts.uri,
        );

        const plan = planResume({
          explicitStartMs: bridgeOpts.startPositionMs,
          candidate,
          prompt: promptResume != null,
        });

        // Only `prompt` plans block. `explicit` and `auto` resolve
        // synchronously, so the overwhelmingly common path adds no
        // await and cannot be delayed by a dialog that is not there.
        const choice =
          plan.kind === 'prompt' && promptResume
            ? await promptResume(plan.candidate)
            : undefined;
        const startPositionMs = resolvePlanStartMs(plan, choice);

        // Recorded BEFORE the launch is awaited. A rejected launch must
        // not leave a "now playing" entry for media that never started.
        beginSession({
          uri: bridgeOpts.uri,
          title: bridgeOpts.title,
          ...(mediaKind ? {type: mediaKind} : {}),
          ...(mediaLane ? {mediaLane} : {}),
          ...(provider ? {provider} : {}),
          ...(thumbnailPath ? {thumbnailPath} : {}),
        });

        return openWithResume({
          ...bridgeOpts,
          startPositionMs,
          resumeId: bridgeOpts.uri,
          ...(thumbnailPath ? {artworkPath: thumbnailPath} : {}),
        }).catch(error => {
          endSession();
          throw error;
        });
      },
      getLaunchParams,
    }),
    [openWithResume, getLaunchParams, beginSession, endSession, promptResume],
  );
}