/**
 * F5 — `usePresentation()`: the DERIVED presentation mode.
 *
 * ## What changed, and why the old "honest fallback" tests are gone
 *
 * The mode used to be
 *
 *   pipActive ? 'pip' : videoSurfacePresented ? 'expanded' : 'mini'
 *
 * where `videoSurfacePresented` was the boolean the NATIVE surface mutation
 * returned, written by exactly one hook (`useVideoSurface`). It existed
 * because the picture was a Kotlin-mounted `MpvRenderView` at
 * `android.R.id.content` index 0 — a SIBLING of the React root. No React-side
 * fact could answer "is video actually on screen?", so the only evidence was
 * whatever the native call reported back.
 *
 * It is now
 *
 *   pipActive ? 'pip' : videoPresentation === 'expanded' ? 'expanded' : 'mini'
 *
 * `<SimbaVideo>` is an ordinary view component in this tree
 * (`codegenNativeComponent('SimbaVideoView')`), so "is there video on screen"
 * is no longer a question about the world that someone must report. It is
 * structural: the picture is mounted exactly when the chrome that renders it
 * is mounted.
 *
 * That removes the whole `describe('an unpresentable surface must not claim
 * video is on screen')` block this file used to carry, and it is worth being
 * precise about why, because deleting a whole honest-fallback contract
 * silently would be the actual defect.
 *
 * The failure it guarded was: the app paints the entire video chrome —
 * topbar, transport, overlays — over a window with no video in it. That is
 * the "control that lies" failure. Two things used to be needed to prevent it,
 * and only one of them still exists:
 *
 *   1. the surface reported `false`  →  no longer exists as a state, so it
 *      needs no guard. There is no mount/reject race to guard against.
 *   2. there is something to draw    →  now guaranteed by the tree itself:
 *      `VideoSurface` renders `<SimbaVideo>` in the same commit that renders
 *      the chrome, so chrome-without-picture is not expressible.
 *
 * Point (2) is the load-bearing one and it is NOT re-tested here, because
 * asserting it from this file would only re-assert the derivation it already
 * reads. It is pinned where it is actually true — see
 * `VideoSurface.test.tsx` ("renders the native picture in the same tree as the
 * chrome") and `PlayerChrome.test.tsx`.
 *
 * What replaces the deleted block is the honest version of the same instinct:
 * this derivation reads the app's OWN REQUEST and never the session. A test
 * pins that.
 *
 * ## The contract that still matters
 *
 * `mode` is derived at READ time and has no writer of its own. Two React roots
 * once each ran an effect writing the same process-global store, which is how
 * the chrome flickered in and out over a playing video. Re-rendering any number
 * of live subscribers still cannot drag the others along.
 */

import React from 'react';
import {act, renderHook} from '@testing-library/react-native';
import {usePresentation} from '../../../src/infrastructure/player/usePresentation';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

describe('usePresentation — derived mode', () => {
  beforeEach(() => {
    usePresentationStore.setState({
      pipActive: false,
      videoPresentation: 'mini',
    });
  });

  describe('the two derived inputs', () => {
    it('is expanded when the user asked for fullscreen', async () => {
      usePresentationStore.setState({videoPresentation: 'expanded'});
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('expanded');
      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isPip).toBe(false);
    });

    it('is mini when the user asked for the dock', async () => {
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');
      expect(result.current.isExpanded).toBe(false);
    });

    it(
      'is pip whenever the PiP window is up, even though fullscreen was asked for',
      async () => {
        usePresentationStore.setState({
          pipActive: true,
          videoPresentation: 'expanded',
        });
        const {result} = await renderHook(() => usePresentation());
        expect(result.current.mode).toBe('pip');
        expect(result.current.isPip).toBe(true);
        // The chrome is suppressed in PiP even though the video is right
        // there underneath — the PiP window owns it.
        expect(result.current.isExpanded).toBe(false);
      },
    );
  });

  /**
   * THE replacement for the deleted "unpresentable surface" block.
   *
   * The old derivation needed a THIRD input to keep `isMini` honest, because
   * `mode === 'mini'` alone would advertise a video in a dock that had
   * nothing to put in it. That guard is gone with the input.
   *
   * What must NOT happen is the derivation reaching for a different fact to
   * rebuild the guard — most naturally by reading the session, since "a video
   * session exists" is right there and looks like a reasonable proxy. That is
   * the same mistake the old comment warned about ("a video session existing
   * is NOT evidence that video is on screen"), reappearing one layer down: a
   * session is not evidence that a session is still on screen either.
   *
   * So: pin that this module reads no session state at all.
   */
  describe('the derivation reads the request, never the session', () => {
    it('imports nothing from nowPlayingStore', () => {
      // If a session read is ever added to the derivation, this fails. It is
      // a static check because a behavioural test cannot distinguish "reads
      // the session and ignores it" from "reads the session and uses it".
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(
          __dirname,
          '../../../src/infrastructure/player/usePresentation.ts',
        ),
        'utf8',
      );
      expect(src).not.toMatch(/nowPlayingStore|useNowPlaying/);
    });

    it('reports mini from the request alone — no third input to satisfy', async () => {
      // The old version of this line needed a `videoSurfacePresented: true`
      // to reach 'mini'. With one input it must already be there.
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.mode).toBe('mini');
      expect(result.current.isMini).toBe(true);
    });

    it('round-trips videoPresentation through setVideoPresentation', async () => {
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.videoPresentation).toBe('mini');

      await act(async () => {
        result.current.setVideoPresentation('expanded');
      });
      expect(result.current.videoPresentation).toBe('expanded');
      expect(result.current.mode).toBe('expanded');

      await act(async () => {
        result.current.setVideoPresentation('mini');
      });
      expect(result.current.videoPresentation).toBe('mini');
      expect(result.current.mode).toBe('mini');
    });
  });

  /**
   * `isMini` is NOT simply `!isExpanded`.
   *
   * During PiP both are false. Drawing a mini bar under a PiP window would be
   * a second, competing presentation of one video, so a caller that wants "the
   * dock" must not be handed `true` for PiP. This is the one place the flags
   * legitimately disagree, and it is why they are read off `mode` rather than
   * recomputed.
   */
  describe('isMini during PiP', () => {
    it('is false, so nothing draws a dock under the PiP window', async () => {
      usePresentationStore.setState({
        pipActive: true,
        videoPresentation: 'expanded',
      });
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.isPip).toBe(true);
      expect(result.current.isExpanded).toBe(false);
      expect(result.current.isMini).toBe(false);
    });

    it('is false even while the request is still mini', async () => {
      // The subtle one. `videoPresentation` stays 'mini' through PiP — the
      // request does not change when a window does. So `isMini` has to be
      // derived from `mode`, not from `videoPresentation !== 'expanded'`,
      // or the dock would appear under the PiP window.
      usePresentationStore.setState({
        pipActive: true,
        videoPresentation: 'mini',
      });
      const {result} = await renderHook(() => usePresentation());
      expect(result.current.videoPresentation).toBe('mini');
      expect(result.current.isMini).toBe(false);
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
   * along.
   */
  describe('several live subscribers (the shipped bug)', () => {
    it('reports a stable, self-consistent mode to each of them', async () => {
      const first = await renderHook(() => usePresentation());
      const second = await renderHook(() => usePresentation());

      expect(first.result.current.mode).toBe('mini');
      expect(second.result.current.mode).toBe('mini');

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('expanded');
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

    it('entering PiP in one subscriber is seen by both', async () => {
      const first = await renderHook(() => usePresentation());
      const second = await renderHook(() => usePresentation());

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('expanded');
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

  it('never stores `mode` — a derived value cannot be persisted', async () => {
    // The module's whole thesis. W6.0 stored `mode` and wrote it to MMKV; a
    // `'pip'` left on disk by a process that died in Picture-in-Picture
    // stranded the player permanently, because the restoring code refused to
    // overwrite a value it believed the PiP flow owned.
    //
    // The old version of this test asserted two store fields equalled their
    // `beforeEach` seed, which made it pass whether or not the code was
    // correct — it could not fail. This one can: if anyone re-adds a stored
    // `mode`, the key comes back and this fails.
    expect(usePresentationStore.getState()).not.toHaveProperty('mode');

    // And driving the derivation must not quietly add one either.
    const {result} = await renderHook(() => usePresentation());
    await act(async () => {
      result.current.togglePip();
    });
    expect(result.current.mode).toBe('pip');
    expect(usePresentationStore.getState()).not.toHaveProperty('mode');
  });
});