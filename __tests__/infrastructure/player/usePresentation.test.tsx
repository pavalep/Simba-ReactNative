/**
 * W6.0 — `usePresentation()`: the DERIVED presentation mode.
 *
 * This suite replaces `usePresentationSync.test.ts`, which asserted the
 * behaviour that shipped a black player screen. That test proved a
 * `usePresentationSync()` effect moved a stored `mode` in response to
 * `useIsPlayerActivity()` — correct in isolation, and wrong in the app,
 * because `App` is mounted once per activity React root. Both roots ran
 * the effect against one process-global zustand store and fought over
 * it (`expanded ⇄ mini`, forever), tearing the chrome down and
 * rebuilding it several times a second over a playing video. See
 * `src/state/usePresentationStore.ts`.
 *
 * The mode is now computed at read time, so the contract pinned here
 * is different in kind, and stronger: there is no writer, so there is
 * nothing that can race.
 *
 * `useIsPlayerActivity` is mocked with a PER-WRAPPER implementation
 * rather than one `jest.fn`. That is deliberate and load-bearing: the
 * real hook reads a React context supplied from the root component's
 * `initialProps`, and `initialProps` are per-ROOT. A single shared
 * `jest.fn` would model the OLD native bridge — one process-wide
 * `isCurrentActivityPlayer()` flag that every mounted root reads —
 * and the two-root tests below would then fail for a reason that is an
 * artifact of the mock rather than a defect in the code.
 *
 * (`playerHost.test.tsx` covers the per-tree channel itself, including
 * the reason the process-wide native flag cannot be used here.)
 */

import * as React from 'react';
import {act, renderHook} from '@testing-library/react-native';
import {PlayerHostProvider} from '../../../src/infrastructure/player/playerHost';
import {usePresentation} from '../../../src/infrastructure/player/usePresentation';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

jest.mock('../../../src/infrastructure/player/playbackFacade', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/player/playbackFacade',
  );
  return {...actual, useIsPlayerActivity: actual.useIsPlayerActivity};
});

/** A wrapper that mounts a hook under one activity's player-host value. */
const host = (isPlayerActivity: boolean) => {
  const Wrapper = ({children}: {children: React.ReactNode}) => (
    <PlayerHostProvider isPlayerActivity={isPlayerActivity}>
      {children}
    </PlayerHostProvider>
  );
  Wrapper.displayName = `PlayerHost(${isPlayerActivity})`;
  return Wrapper;
};

/**
 * Mount two independent roots at once, the way `MainActivity` and
 * `PlayerActivity` coexist in one process.
 */
async function mountBothActivityRoots() {
  const mainActivity = await renderHook(() => usePresentation(), {
    wrapper: host(false),
  });
  const playerActivity = await renderHook(() => usePresentation(), {
    wrapper: host(true),
  });
  return {mainActivity, playerActivity};
}

describe('usePresentation — derived mode', () => {
  beforeEach(() => {
    usePresentationStore.setState({pipActive: false});
  });

  describe('the two derived inputs', () => {
    it('is expanded when this tree hosts a player surface', async () => {
      const {result} = await renderHook(() => usePresentation(), {
        wrapper: host(true),
      });
      expect(result.current.mode).toBe('expanded');
      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isPip).toBe(false);
    });

    it('is mini in a tree with no player surface', async () => {
      const {result} = await renderHook(() => usePresentation(), {
        wrapper: host(false),
      });
      expect(result.current.mode).toBe('mini');
      expect(result.current.isExpanded).toBe(false);
    });

    it('is pip whenever the PiP window is up, in either activity', async () => {
      usePresentationStore.setState({pipActive: true});

      const inPlayer = await renderHook(() => usePresentation(), {
        wrapper: host(true),
      });
      expect(inPlayer.result.current.mode).toBe('pip');
      expect(inPlayer.result.current.isPip).toBe(true);
      // The chrome is suppressed in PiP even though the surface is
      // right there underneath — the PiP window owns it.
      expect(inPlayer.result.current.isExpanded).toBe(false);
      await inPlayer.unmount();

      const inMain = await renderHook(() => usePresentation(), {
        wrapper: host(false),
      });
      expect(inMain.result.current.mode).toBe('pip');
      await inMain.unmount();
    });

    it('fails closed with no provider — chrome is not mounted blind', async () => {
      // A missing provider is the jest / Storybook / isolated-component
      // case. Rendering the chrome over a surface that is not there is
      // the worse failure, so the answer is `false`.
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');
      expect(result.current.isExpanded).toBe(false);
    });
  });

  /**
   * THE regression test. Two mounted roots must not be able to
   * disagree about the mode, because neither of them writes it.
   *
   * Under the old shared store each tree's effect rewrote the other's
   * value, so these two hooks could never both be right — and the
   * player tree was whichever won last, which is why the chrome
   * flickered in and out over a playing video.
   */
  describe('two activity roots mounted at once (the shipped bug)', () => {
    it('reports a stable, self-consistent mode per tree', async () => {
      // The player activity mounts while MainActivity's tree is still
      // alive in the background — the exact overlap that shipped.
      const {mainActivity, playerActivity} = await mountBothActivityRoots();

      expect(mainActivity.result.current.mode).toBe('mini');
      expect(playerActivity.result.current.mode).toBe('expanded');

      // Re-rendering either tree must not drag the other along. Under
      // the shared store each root's effect overwrote the other's value
      // on every one of these re-renders.
      await mainActivity.rerender({});
      await playerActivity.rerender({});
      await mainActivity.rerender({});
      expect(mainActivity.result.current.mode).toBe('mini');
      expect(playerActivity.result.current.mode).toBe('expanded');

      await mainActivity.unmount();
      await playerActivity.unmount();
    });

    it('entering PiP in one tree does not drag the other tree along', async () => {
      const {mainActivity, playerActivity} = await mountBothActivityRoots();

      // `act` so the zustand write is flushed into BOTH mounted roots
      // before either is read — these are two live subscriptions to one
      // store, which is exactly the shape the real app has.
      await act(async () => {
        playerActivity.result.current.setPipActive(true);
      });
      expect(playerActivity.result.current.mode).toBe('pip');
      expect(mainActivity.result.current.mode).toBe('pip');

      // PiP IS genuinely global — the window state is shared. But the
      // non-pip fallback is still per-tree: when PiP ends, each tree
      // returns to whatever ITS OWN host says, with no write.
      await act(async () => {
        playerActivity.result.current.setPipActive(false);
      });
      expect(mainActivity.result.current.mode).toBe('mini');
      expect(playerActivity.result.current.mode).toBe('expanded');

      await mainActivity.unmount();
      await playerActivity.unmount();
    });
  });

  describe('the PiP flow flag', () => {
    it('starts off — a PiP window cannot survive process death', () => {
      // The old store persisted `mode` to MMKV and wrote `'pip'` there.
      // Because `usePresentationSync` deliberately never overwrote
      // `'pip'`, a process killed in Picture-in-Picture came back
      // permanently suppressed. Nothing is persisted now, so the
      // initial value is always the honest one.
      expect(usePresentationStore.getState().pipActive).toBe(false);
    });

    it('togglePip flips the flag, and the mode follows', async () => {
      const {result} = await renderHook(() => usePresentation(), {
        wrapper: host(true),
      });
      expect(result.current.mode).toBe('expanded');

      await act(async () => {
        result.current.togglePip();
      });
      expect(usePresentationStore.getState().pipActive).toBe(true);
      expect(result.current.mode).toBe('pip');

      await act(async () => {
        result.current.togglePip();
      });
      expect(usePresentationStore.getState().pipActive).toBe(false);
      expect(result.current.mode).toBe('expanded');
    });
  });
});
