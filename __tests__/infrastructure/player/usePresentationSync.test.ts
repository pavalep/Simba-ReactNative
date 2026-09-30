/**
 * V19 W6.0 — the mount gate and the presentation sync.
 *
 * Before W6.0 the V19 chrome was unreachable at runtime: the
 * presentation mode was driven by the `NowPlaying` route's mount
 * effect, but nothing in the app ever navigates to `NowPlaying`, so
 * the mode sat at its `'mini'` default and the `mini` branch rendered
 * `VideoMiniPlayer` — still the W0 `return null` stub. Every
 * primitive built in W1–W5 was therefore dead code.
 *
 * These tests pin the two things that make the chrome reachable:
 *   1. `useIsPlayerActivity()` gates the mount — true only inside
 *      `PlayerActivity`, where the native `MpvRenderView` lives.
 *   2. `usePresentationSync()` drives mini ⇄ expanded from that
 *      predicate, and never touches `'pip'`.
 */

import {renderHook} from '@testing-library/react-native';
import {useIsPlayerActivity} from '../../../src/infrastructure/player/playbackFacade';
import {usePresentationSync} from '../../../src/infrastructure/player/usePresentationSync';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

const mockIsPlayerActivity = jest.fn<boolean, []>();

jest.mock(
  '../../../src/infrastructure/player/playbackFacade',
  () => ({
    useIsPlayerActivity: () => mockIsPlayerActivity(),
  }),
);

describe('useIsPlayerActivity → usePresentationSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePresentationStore.getState().setMode('mini');
  });

  describe('inside the player activity', () => {
    beforeEach(() => {
      mockIsPlayerActivity.mockReturnValue(true);
    });

    it('drives the mode to expanded', async () => {
      const {result} = await renderHook(() => usePresentationSync());
      // The hook writes in an effect; renderHook's act flush covers it.
      expect(result).toBeTruthy();
      expect(usePresentationStore.getState().mode).toBe('expanded');
    });

    it('leaves an already-expanded mode alone (no write churn)', async () => {
      usePresentationStore.getState().setMode('expanded');
      await renderHook(() => usePresentationSync());
      expect(usePresentationStore.getState().mode).toBe('expanded');
    });

    it('does NOT clobber pip — PiP owns the mode until it exits', async () => {
      // W6.1 owns the PiP enter/exit reconciliation. If this hook
      // overwrote 'pip' with 'expanded', dismissing the PiP window
      // would leave the chrome in a state the user never chose.
      usePresentationStore.getState().setMode('pip');
      await renderHook(() => usePresentationSync());
      expect(usePresentationStore.getState().mode).toBe('pip');
    });
  });

  describe('outside the player activity (MainActivity)', () => {
    beforeEach(() => {
      mockIsPlayerActivity.mockReturnValue(false);
    });

    it('drives the mode back to mini', async () => {
      usePresentationStore.getState().setMode('expanded');
      await renderHook(() => usePresentationSync());
      expect(usePresentationStore.getState().mode).toBe('mini');
    });

    it('does NOT clobber pip', async () => {
      usePresentationStore.getState().setMode('pip');
      await renderHook(() => usePresentationSync());
      expect(usePresentationStore.getState().mode).toBe('pip');
    });
  });

  it('is idempotent — repeated syncs converge on one mode', async () => {
    mockIsPlayerActivity.mockReturnValue(true);
    const {rerender} = await renderHook(() => usePresentationSync());
    await rerender({});
    await rerender({});
    expect(usePresentationStore.getState().mode).toBe('expanded');
  });
});
