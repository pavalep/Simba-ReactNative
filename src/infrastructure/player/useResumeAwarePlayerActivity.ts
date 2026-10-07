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

import {useMemo} from 'react';
import {
  useOpenWithResume,
  usePlayerActivity as useLibPlayerActivity,
} from '@simba-dev/react-native-media-player';
import type {
  OpenPlayerOptions,
  UsePlayerActivityResult,
} from '@simba-dev/react-native-media-player';
import {useNowPlayingStore} from '../../state/nowPlayingStore';

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
 * `usePlayerActivity` with resume applied by default.
 *
 * Replaces the lib's pass-through hook for every app call site. See
 * `./index.ts` for why resume belongs at this seam rather than at 28
 * screens, and `resumePolicy.ts` for what the policy actually does.
 *
 * Behaviour contract:
 *   - `resumeId` is the media `uri` (the app's resume key everywhere —
 *     `resolveResumeMs` matches on `Bookmark.fileUri` /
 *     `RecentHistoryEntry.fileUri`).
 *   - An **explicit `startPositionMs` still wins**. That precedence
 *     belongs to the lib's `useOpenWithResume`, so it is delegated to
 *     rather than reimplemented here; two sources of truth for one
 *     rule is how the previous 1000x-seek bug happened.
 *   - **W9.4:** the launch is recorded in `useNowPlayingStore`. The lib
 *     cannot tell us which file a single-file launch is playing (its
 *     `currentUri` comes from the queue, which `openPlayer` does not
 *     populate), so the seam — which was handed the URI — is the only
 *     place that can publish it. `usePlaybackCheckpointSync` reads it
 *     to write resume checkpoints.
 */
export function usePlayerActivity(): UsePlayerActivityResult {
  const {getLaunchParams} = useLibPlayerActivity();
  const openWithResume = useOpenWithResume();
  const beginSession = useNowPlayingStore(s => s.begin);
  const endSession = useNowPlayingStore(s => s.end);

  return useMemo<UsePlayerActivityResult>(
    () => ({
      openPlayer: (opts: OpenPlayerOptions) => {
        // Identity fields are ours; the bridge must not see them, so
        // they are destructured off before delegating. Forwarding an
        // unknown key across the bridge is how argument-shape drift
        // starts. `type` is deliberately NOT destructured — it belongs
        // to the bridge and is required there.
        const {mediaKind, mediaLane, provider, thumbnailPath, ...bridgeOpts} =
          opts as AppOpenPlayerOptions;

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

        return openWithResume({...bridgeOpts, resumeId: bridgeOpts.uri}).catch(
          error => {
            endSession();
            throw error;
          },
        );
      },
      getLaunchParams,
    }),
    [openWithResume, getLaunchParams, beginSession, endSession],
  );
}