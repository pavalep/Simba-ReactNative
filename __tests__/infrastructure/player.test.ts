/**
 * V21 W3 P10 — Player Facade smoke test
 *
 * Verifies the facade at `src/infrastructure/player/index.ts`
 * re-exports the 9 symbols documented in
 * `md/SIMBA_V21_W3_P09_INVENTORY.md`:
 *
 *   - 8 functions: usePlayerActivity, useOpenPlaylist, usePlayer,
 *     useQueue, useQueueItemsAs, usePlaybackHistoryAs,
 *     resolveStreamType, getMpvPlayerModule
 *   - 1 type:      PlayerQueueItem
 *
 * No functional testing of the player module itself — that's the
 * player module's job, not this facade's. The smoke test exists
 * to catch:
 *   - missing re-exports (a refactor accidentally drops a symbol)
 *   - import path regressions (someone moves the file and forgets
 *     the `@simba-dev/react-native-media-player` source)
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

  it('exports the PlayerQueueItem type (compile-time check)', () => {
    // If `PlayerQueueItem` were missing or renamed, this would
    // fail to type-check. Assigning to a typed variable gives
    // us a runtime probe without invoking the type at runtime.
    const sample: PlayerQueueItem | undefined = undefined;
    expect(sample).toBeUndefined();
  });

  it('re-exports are the same identity as the underlying module', () => {
    // This is the key check: the facade is a pure re-export, not
    // a wrapper. If a future refactor accidentally wraps a symbol
    // (e.g., to add logging), this test will fail and force the
    // author to make a deliberate decision about wrapping.
    const underlying = jest.requireActual(
      '@simba-dev/react-native-media-player',
    );
    expect(Player.usePlayerActivity).toBe(underlying.usePlayerActivity);
    expect(Player.useOpenPlaylist).toBe(underlying.useOpenPlaylist);
    expect(Player.usePlayer).toBe(underlying.usePlayer);
    expect(Player.useQueue).toBe(underlying.useQueue);
    expect(Player.useQueueItemsAs).toBe(underlying.useQueueItemsAs);
    expect(Player.usePlaybackHistoryAs).toBe(
      underlying.usePlaybackHistoryAs,
    );
    expect(Player.resolveStreamType).toBe(underlying.resolveStreamType);
    expect(Player.getMpvPlayerModule).toBe(underlying.getMpvPlayerModule);
  });
});
