/**
 * V21 F5 A1 — the BARREL must hand call sites a seam-routing `useOpenPlaylist`.
 *
 * ## Why this file exists separately from `usePlaylistLaunch.test.tsx`
 *
 * The suite next door imports `./usePlaylistLaunch` directly, so it proves the
 * hook is correct but says nothing about which one the three call sites get.
 * They all import `useOpenPlaylist` from the **barrel**, and until A1 the
 * barrel re-exported the LIB's hook — so the exact regression that A1 fixes
 * was invisible to a suite that tested the module rather than the export.
 *
 * That is the same shape as the P0 `setClassName` landmine and as the stale
 * `VideoTitleOverlay` docblock: the code under test was fine, and the thing
 * that was actually wrong sat one layer out.
 *
 * ## Asserted behaviourally, not by reference identity
 *
 * A first attempt compared `barrel.useOpenPlaylist === module.useOpenPlaylist`.
 * It failed with "serializes to the same string" — two distinct function
 * objects with the same source, which says nothing useful about which
 * implementation a caller receives. The property that actually matters is
 * behavioural: does calling the barrel's hook run the app seam? That is what
 * is asserted here, and it holds regardless of module-instance duplication.
 */

const mockOpenPlayer = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);
const mockLibStartActivity = jest.fn(async () => true);

// The lib's `useOpenPlaylist` resolves to the lib's own `usePlayerActivity`,
// whose video branch is `bridge.openPlayer` → `startActivity(PlayerActivity)`.
// Modelling BOTH makes a regression fail on the thing F5 A2 deletes, with a
// name that says so — instead of on `undefined is not a function`.
jest.mock('@simba-dev/react-native-media-player', () => ({
  useOpenPlaylist: () => ({
    openPlaylist: async () => mockLibStartActivity(),
  }),
  usePlayerActivity: () => ({openPlayer: mockLibStartActivity}),
}));

jest.mock('../../../src/infrastructure/player/useResumeAwarePlayerActivity', () => ({
  usePlayerActivity: () => ({openPlayer: mockOpenPlayer}),
}));

import {renderHook} from '@testing-library/react-native';
import {useOpenPlaylist} from '../../../src/infrastructure/player';

const ENTRIES = [
  {uri: 'file:///a.mkv', title: 'A', type: 'movie' as const, mediaType: 'video' as const},
  {uri: 'file:///b.mp3', title: 'B', type: 'music' as const, mediaType: 'audio' as const},
];

describe('player barrel — useOpenPlaylist ownership', () => {
  beforeEach(() => {
    mockOpenPlayer.mockClear();
    mockLibStartActivity.mockClear();
  });

  it('routes a playlist launch from the barrel through the app seam', async () => {
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {type: 'video'});

    expect(mockOpenPlayer).toHaveBeenCalledTimes(1);
  });

  it('never reaches the lib path that starts PlayerActivity', async () => {
    // The A1 contract. `bridge.openPlayer` → `startActivity(PlayerActivity)`
    // is what F5 A2 deletes; if this assertion ever fails, A2 is unsafe.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {type: 'video'});

    expect(mockLibStartActivity).not.toHaveBeenCalled();
  });

  it('carries the entry lane through the barrel, not just the kind', async () => {
    // The `C-16` fix for playlists, asserted at the layer the call sites
    // actually use. `PlaylistEntry` has `mediaType` on every entry and the
    // lib hook discarded it, so the session recorded no lane.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {type: 'video'});

    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({mediaKind: 'movie', mediaLane: 'video'}),
    );
  });
});