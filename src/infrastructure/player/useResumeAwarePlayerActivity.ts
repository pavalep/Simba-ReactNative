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
 */
export function usePlayerActivity(): UsePlayerActivityResult {
  const {getLaunchParams} = useLibPlayerActivity();
  const openWithResume = useOpenWithResume();

  return useMemo<UsePlayerActivityResult>(
    () => ({
      openPlayer: (opts: OpenPlayerOptions) =>
        openWithResume({...opts, resumeId: opts.uri}),
      getLaunchParams,
    }),
    [openWithResume, getLaunchParams],
  );
}