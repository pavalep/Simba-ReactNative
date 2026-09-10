/**
 * V21 W3 P10 — Player Facade smoke test
 * V21 W7 P25 — added usePlayerProgress
 * V21 W7 P26 — added usePlayWithResume (real wrapper, NOT a re-export)
 * V21 W7 P28 — added usePlay (real wrapper, NOT a re-export)
 * V21 W22 D-023 — added usePlaybackFacade (real wrapper, NOT a re-export)
 *
 * Verifies the facade at `src/infrastructure/player/index.ts`
 * re-exports the 12 symbols documented in
 * `md/SIMBA_V21_W3_P09_INVENTORY.md` (P10) + P25 + P26 + P28 + D-023:
 *
 *   - 11 functions: usePlayerActivity, useOpenPlaylist, usePlayer,
 *     usePlayerProgress, useQueue, useQueueItemsAs,
 *     usePlaybackHistoryAs, resolveStreamType, getMpvPlayerModule,
 *     usePlayWithResume, usePlay, usePlaybackFacade
 *   - 1 type:       PlayerQueueItem
 *   - 1 helper:     secondsToMs (re-exported from ./position)
 *
 * The P26 / P28 / D-023 hooks (usePlayWithResume, usePlay,
 * usePlaybackFacade) are real wrappers, NOT re-exports. The
 * "same identity as the underlying module" test therefore
 * deliberately excludes them.
 *
 * No functional testing of the player module itself — that's the
 * player module's job, not this facade's. The smoke test exists
 * to catch:
 *   - missing re-exports (a refactor accidentally drops a symbol)
 *   - import path regressions (someone moves the file and forgets
 *     the `@simba-dev/react-native-media-player` source)
 *   - accidental wrapping of a symbol that should stay a
 *     re-export (catches the inverse of P26 too)
 */

import * as Player from '../../src/infrastructure/player';
import type {PlayerQueueItem} from '../../src/infrastructure/player';

describe('Player Facade (V21 W3 P10) — re-exports', () => {
  it('exports usePlayerActivity as a function', () => {
    expect(typeof Player.usePlayerActivity).toBe('function');
  });

  it('exports useOpenPlaylist as a function', () => {
    expect(typeof Player.useOpenPlaylist).toBe('function');
  });

  it('exports usePlayer as a function', () => {
    expect(typeof Player.usePlayer).toBe('function');
  });

  it('exports usePlayerProgress as a function (V21 W7 P25)', () => {
    expect(typeof Player.usePlayerProgress).toBe('function');
  });

  it('exports useQueue as a function', () => {
    expect(typeof Player.useQueue).toBe('function');
  });

  it('exports useQueueItemsAs as a function', () => {
    expect(typeof Player.useQueueItemsAs).toBe('function');
  });

  it('exports usePlaybackHistoryAs as a function', () => {
    expect(typeof Player.usePlaybackHistoryAs).toBe('function');
  });

  it('exports resolveStreamType as a function', () => {
    expect(typeof Player.resolveStreamType).toBe('function');
  });

  it('exports getMpvPlayerModule as a function', () => {
    expect(typeof Player.getMpvPlayerModule).toBe('function');
  });

  it('exports usePlayWithResume as a function (V21 W7 P26 - wrapper, not re-export)', () => {
    expect(typeof Player.usePlayWithResume).toBe('function');
  });

  it('exports usePlay as a function (V21 W7 P28 - wrapper, not re-export)', () => {
    expect(typeof Player.usePlay).toBe('function');
  });

  it('exports usePlaybackFacade as a function (V21 W22 D-023 - wrapper, not re-export)', () => {
    expect(typeof Player.usePlaybackFacade).toBe('function');
  });

  it('exports secondsToMs as a function (V21 W7 P26 - re-exported from ./position)', () => {
    expect(typeof Player.secondsToMs).toBe('function');
  });

  it('exports the PlayerQueueItem type (compile-time check)', () => {
    // If `PlayerQueueItem` were missing or renamed, this would
    // fail to type-check. Assigning to a typed variable gives
    // us a runtime probe without invoking the type at runtime.
    const sample: PlayerQueueItem | undefined = undefined;
    expect(sample).toBeUndefined();
  });

  it('re-exports are the same identity as the underlying module', () => {
    // This is the key check: the 9 P10 re-exports + P25's
    // usePlayerProgress stay pure. If a future refactor
    // accidentally wraps one of these (e.g., to add logging),
    // this test will fail and force the author to make a
    // deliberate decision about wrapping.
    //
    // The P26 `usePlayWithResume` is intentionally NOT in this
    // list — it's a real wrapper (see the doc comment above),
    // not a re-export.
    const underlying = jest.requireActual(
      '@simba-dev/react-native-media-player',
    );
    expect(Player.usePlayerActivity).toBe(underlying.usePlayerActivity);
    expect(Player.useOpenPlaylist).toBe(underlying.useOpenPlaylist);
    expect(Player.usePlayer).toBe(underlying.usePlayer);
    expect(Player.usePlayerProgress).toBe(underlying.usePlayerProgress);
    expect(Player.useQueue).toBe(underlying.useQueue);
    expect(Player.useQueueItemsAs).toBe(underlying.useQueueItemsAs);
    expect(Player.usePlaybackHistoryAs).toBe(
      underlying.usePlaybackHistoryAs,
    );
    expect(Player.resolveStreamType).toBe(underlying.resolveStreamType);
    expect(Player.getMpvPlayerModule).toBe(underlying.getMpvPlayerModule);
  });
});
