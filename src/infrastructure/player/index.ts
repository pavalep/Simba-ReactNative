/**
 * V21 W3 P10 — Player Facade
 *
 * The single public entry point for everything the rest of the
 * app needs from `@simba-dev/react-native-media-player`. The
 * V21 FOLDERS contract (see `md/SIMBA_V21_FOLDERS.md`) makes
 * `src/infrastructure/player/` the ONLY directory allowed to
 * import from the player module. The 36 files that currently
 * import the player module directly (see
 * `md/SIMBA_V21_W3_P09_INVENTORY.md`) will be migrated to import
 * from this facade in W3 P11; once that's done, the import-boundary
 * linter (`scripts/check-import-boundaries.js`) should report
 * 0 PLAYER rule violations.
 *
 * Why a facade and not direct re-exports:
 *   1. **Boundary enforcement** — the linter flags direct imports
 *      of the player module outside `src/infrastructure/player/`.
 *      New call sites can't bypass the facade.
 *   2. **Type safety** — consumers don't need to know about the
 *      player module's package name. The re-exports preserve
 *      the same TypeScript types as the underlying module.
 *   3. **Refactor safety** — if the player module changes its
 *      API, only this file needs to be updated, not 36 files.
 *   4. **Tree-shaking** — the bundler can statically analyze
 *      which symbols are used and dead-code-eliminate the rest.
 *
 * Symbol organization (6 facade API surfaces):
 *   - **read-state**:        usePlayerActivity
 *   - **open-in-player**:    useOpenPlaylist
 *   - **play-with-resume**:  usePlayWithResume (P26 — explicit position in seconds)
 *   - **stream-resolution**: resolveStreamType  (pure function)
 *   - **queue**:             useQueue, useQueueItemsAs,
 *                            usePlaybackHistoryAs, PlayerQueueItem
 *   - **player-imperative**: usePlayer, usePlayerProgress (state/commands + position/duration)
 *   - **low-level**:         getMpvPlayerModule (escape hatch)
 *
 * The P26 `usePlayWithResume` hook is the first facade symbol
 * that adds real logic (not just a re-export). The unit
 * conversion (seconds → ms) is the load-bearing fix — see
 * `position.ts` for the pure helper + rationale.
 */

import {useCallback} from 'react';
import {
  resolveStreamType,
  usePlayerActivity,
} from '@simba-dev/react-native-media-player';
import type {MediaKind, MediaLane} from '../../types/media';
import {secondsToMs} from './position';

export {
  usePlayerActivity,
  useOpenPlaylist,
  usePlayer,
  usePlayerProgress,
  useQueue,
  useQueueItemsAs,
  usePlaybackHistoryAs,
  resolveStreamType,
  getMpvPlayerModule,
} from '@simba-dev/react-native-media-player';

export type {PlayerQueueItem} from '@simba-dev/react-native-media-player';

export {secondsToMs} from './position';

// ─── W7 P26 — usePlayWithResume ──────────────────────────────

/**
 * Input shape for `usePlayWithResume`. The caller already knows
 * the saved position (from the bookmarks store, the history
 * store, or a `position` field on the item being tapped). The
 * hook handles the bridge plumbing + unit conversion.
 */
export interface PlayWithResumeInput {
  uri: string;
  title: string;
  /** Stream type or content kind. Pass-through to `resolveStreamType`. */
  mediaType: MediaKind | MediaLane | 'video' | 'audio';
  /** Saved resume position in **seconds**. 0 (or non-positive) starts from the beginning. */
  positionSec: number;
}

/**
 * V21 W7 P26 — open a media item with an explicit resume position.
 *
 * Fixes two bugs found in the W7 P26 audit:
 *   1. `HistoryScreen.handlePress` was passing `startPositionMs: position`
 *      where `position` was in **seconds** (the history store's
 *      convention) but the field expects **milliseconds** — every
 *      resume seek was 1000x too small.
 *   2. `useBookmarksScreen.handlePress` was not passing
 *      `startPositionMs` at all — bookmark positions were silently
 *      ignored, so tapping a saved bookmark always played from 0.
 *
 * The auto-lookup variant (where the bridge resolves the resume
 * position from a `PlayerResumeProvider` lookup at `openPlayer` time)
 * is the player module's `useOpenWithResume` hook. Wiring the
 * `PlayerResumeProvider` at App.tsx with a lookup that reads the
 * bookmarks + history stores is a W22 follow-up; for now, callers
 * that already know the position (History / Bookmarks) pass it
 * explicitly via this hook.
 *
 * Returns `Promise<boolean>` matching `usePlayerActivity().openPlayer`'s
 * contract: `true` if the bridge accepted the launch, `false`
 * otherwise.
 */
export function usePlayWithResume(): (
  input: PlayWithResumeInput,
) => Promise<boolean> {
  const {openPlayer} = usePlayerActivity();
  return useCallback(
    (input: PlayWithResumeInput) => {
      const startPositionMs = secondsToMs(input.positionSec);
      return openPlayer({
        uri: input.uri,
        title: input.title,
        type: resolveStreamType(input.mediaType),
        ...(startPositionMs != null ? {startPositionMs} : {}),
      });
    },
    [openPlayer],
  );
}
