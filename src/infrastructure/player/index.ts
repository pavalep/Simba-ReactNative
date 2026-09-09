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
 * Symbol organization (4 facade API surfaces):
 *   - **read-state**:        usePlayerActivity
 *   - **open-in-player**:    useOpenPlaylist
 *   - **stream-resolution**: resolveStreamType  (pure function)
 *   - **queue**:             useQueue, useQueueItemsAs,
 *                            usePlaybackHistoryAs, PlayerQueueItem
 *   - **player-imperative**: usePlayer          (escape hatch)
 *   - **low-level**:         getMpvPlayerModule (escape hatch)
 *
 * No code change here vs. a bare re-export — the value of the
 * facade is the boundary, not the wrapping. If a future phase
 * needs a real wrapper (e.g., to add error boundaries, retries,
 * or logging around player calls), this is where it goes.
 */

export {
  usePlayerActivity,
  useOpenPlaylist,
  usePlayer,
  useQueue,
  useQueueItemsAs,
  usePlaybackHistoryAs,
  resolveStreamType,
  getMpvPlayerModule,
} from '@simba-dev/react-native-media-player';

export type {PlayerQueueItem} from '@simba-dev/react-native-media-player';
