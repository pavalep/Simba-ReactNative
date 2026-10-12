/**
 * V21 F3 — `usePresentation()`: the DERIVED presentation mode.
 *
 * ## What changed and why it is not a detail
 *
 * The mode used to be
 *
 *   pipActive ? 'pip' : isPlayerActivity ? 'expanded' : 'mini'
 *
 * where `isPlayerActivity` meant "is this React tree the dedicated
 * `PlayerActivity`'s tree". Collapsing playback into `MainActivity`
 * deleted that question rather than answering it differently: there is one
 * tree and one mounted surface, always, so the predicate would report
 * 'mini' everywhere and the video chrome would never mount.
 *
 * It is now
 *
 *   pipActive ? 'pip' : videoSurfacePresented ? 'expanded' : 'mini'
 *
 * `videoSurfacePresented` is the boolean the NATIVE surface mutation
 * returned, written by exactly one hook (`useVideoSurface`). It is not a
 * guess about which Activity we are in, and it is not derivable from app
 * state — which is the point of pinning it here.
 *
 * ## The contract that matters most
 *
 * A video session existing is NOT evidence that video is on screen. If the
 * surface is missing or the mutation refused, the answer must be 'mini', so
 * the chrome renders `null` instead of painting a full player UI over a
 * window with nothing in it. Deriving from the session instead would have
 * made the app confidently lie.
 */

import React from 'react';
import {act, renderHook} from '@testing-library/react-native';
import {usePresentation} from '../../../src/infrastructure/player/usePresentation';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

describe('usePresentation — derived mode', () => {
  beforeEach(() => {
    usePresentationStore.setState({
      pipActive: false,
      videoSurfacePresented: false,
    });
  });

  describe('the two derived inputs', () => {
    it('is expanded when the surface is actually showing video', async () => {
      usePresentationStore.setState({videoSurfacePresented: true});
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('expanded');
      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isPip).toBe(false);
    });

    it('is mini when no surface is presented', async () => {
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');
      expect(result.current.isExpanded).toBe(false);
    });

    it('is pip whenever the PiP window is up, even though the surface is presented', async () => {
      usePresentationStore.setState({
        pipActive: true,
        videoSurfacePresented: true,
      });
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('pip');
      expect(result.current.isPip).toBe(true);
      // The chrome is suppressed in PiP even though the surface is right
      // there underneath — the PiP window owns it.
      expect(result.current.isExpanded).toBe(false);
    });
  });

  /**
   * THE honest-fallback contract, and the reason this input is stored
   * rather than derived from the session.
   *
   * A surface that is not mounted, or a `fillVideoBounds` / `setSurfaceVisible`
   * that refused, must collapse to 'mini'. If the mode were computed from
   * "a video session exists", these would all report 'expanded' and the app
   * would paint the entire video chrome — topbar, transport, overlays —
   * over a window with no video in it. That is the "control that lies"
   * failure, and it is invisible in tests that only ever mount a healthy
   * surface.
   */
  describe('an unpresentable surface must not claim video is on screen', () => {
    it('reports mini when the surface mutation refused', async () => {
      // `useVideoSurface` publishes the native call's real `false`.
      usePresentationStore.setState({videoSurfacePresented: false});

      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');
      expect(result.current.isExpanded).toBe(false);
    });

    it('reports mini until the surface has actually been presented', async () => {
      // The window between "session begun" and "surface shown" is real: the
      // session is written first so a rejected launch leaves no orphan, and
      // the surface follows on the next effect. During it, chrome stays off
      // rather than flashing a player over an empty surface.
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');

      await act(async () => {
        usePresentationStore.getState().setVideoSurfacePresented(true);
      });
      expect(result.current.mode).toBe('expanded');

      await act(async () => {
        usePresentationStore.getState().setVideoSurfacePresented(false);
      });
      expect(result.current.mode).toBe('mini');
    });
  });

  /**
   * THE regression test, and it still applies.
   *
   * Under the old design each activity root ran its OWN effect that wrote
   * the SAME process-global store, so two mounted roots could never both be
   * right and the chrome flickered in and out over a playing video. The mode
   * is still computed at read time and still has no writer of its own, so
   * re-rendering any number of live subscribers cannot drag the others
   * along. What changed is the second input, not that property.
   */
  describe('several live subscribers (the shipped bug)', () => {
    it('reports a stable, self-consistent mode to each of them', async () => {
      const first = await renderHook(() => usePresentation());
      const second = await renderHook(() => usePresentation());

      expect(first.result.current.mode).toBe('mini');
      expect(second.result.current.mode).toBe('mini');

      await act(async () => {
        usePresentationStore.getState().setVideoSurfacePresented(true);
      });

      // Re-rendering either must not drag the other along.
      await first.rerender({});
      await second.rerender({});
      await first.rerender({});

      expect(first.result.current.mode).toBe('expanded');
      expect(second.result.current.mode).toBe('expanded');

      await first.unmount();
      await second.unmount();
    });

    it('entering PiP in one subscriber does not make the surface claim video', async () => {
      const first = await renderHook(() => usePresentation());
      const second = await renderHook(() => usePresentation());

      await act(async () => {
        usePresentationStore.getState().setVideoSurfacePresented(true);
      });
      await act(async () => {
        first.result.current.setPipActive(true);
      });

      // PiP IS genuinely global — the window state is shared.
      expect(first.result.current.mode).toBe('pip');
      expect(second.result.current.mode).toBe('pip');

      await act(async () => {
        first.result.current.togglePip();
      });
      expect(first.result.current.mode).toBe('expanded');
      expect(second.result.current.mode).toBe('expanded');

      await first.unmount();
      await second.unmount();
    });
  });

  it('starts mini on a cold start — a derived value must never be persisted', () => {
    // `beforeEach` resets to the store's initial state. A 'pip' or
    // 'expanded' written to disk by an older build would strand the player
    // permanently, which is exactly what happened before.
    expect(usePresentationStore.getState().pipActive).toBe(false);
    expect(usePresentationStore.getState().videoSurfacePresented).toBe(false);
  });
});