/**
 * `usePresentationStore` — the COLD-START contract.
 *
 * ## Why this is a separate file
 *
 * These assertions are about the values a brand-new process starts with, so
 * they have to read a genuinely uninitialised store.
 *
 * Every other presentation test seeds the store in `beforeEach`, which makes
 * it useless for this purpose: a store seeded to `videoPresentation: 'mini'`
 * cannot tell you whether `'mini'` is the default or whether the test just
 * put it there. Two ways around that were tried and one does not work:
 *
 *   - `jest.resetModules()` + fresh `require` — **fails.** It also resets
 *     `react`, so the freshly-loaded `zustand/react` binds to a second React
 *     instance whose dispatcher is still null:
 *     `TypeError: Cannot read properties of null (reading 'useCallback')`.
 *     The second failure mode here is a worse lesson than the first: the
 *     symptom looks like a broken hook, not like a duplicate React.
 *   - A separate test file — **works.** Jest gives each test file its own
 *     module registry, so this file's import is the first and only one, and
 *     the store is exactly what `create()` returned.
 *
 * Nothing here mutates the store, so nothing needs to reset it.
 */

import {usePresentationStore} from '../../src/state/usePresentationStore';

describe('usePresentationStore — cold start', () => {
  it('starts at mini, never expanded', () => {
    // This shipped as 'expanded'. It was survivable only because a second
    // gate hid it: the derivation used to be
    // `videoSurfacePresented ? 'expanded' : 'mini'`, and that flag is false
    // on a cold start, so the wrong value never took effect.
    //
    // Deleting `videoSurfacePresented` removed the mask and exposed it. On
    // device the consequence was concrete: `VideoPlayerChrome` mounted the
    // whole expanded video chrome over an empty player, and every component
    // in it calls the bridge from its own mount effect. React runs CHILD
    // effects before PARENT effects, so all of them beat
    // `PlayerProvider`'s `initPlayer()` effect — eight consecutive
    // `MpvPlayerModule not initialized. Call initPlayer() first.` native
    // exceptions and a red screen on every cold start.
    //
    // 'mini' is the honest value: on a cold start no writer has run, there is
    // no video, and nothing can be expanded. The launch seam promotes it to
    // 'expanded' when a video actually starts.
    expect(usePresentationStore.getState().videoPresentation).toBe('mini');
  });

  it('is not in Picture-in-Picture', () => {
    // A window state cannot survive process death — Android tears the PiP
    // window down with the Activity. W6.0 persisted 'pip' and stranded the
    // player permanently on the next cold start.
    expect(usePresentationStore.getState().pipActive).toBe(false);
  });

  it('has no measured rect', () => {
    // Nothing has been laid out yet. `null` is the honest answer for "we
    // cannot place the picture", not a zeroed rect.
    expect(usePresentationStore.getState().videoMiniRect).toBeNull();
  });

  it('stores no `mode` — the derivation has no writer to race', () => {
    // W6.0 stored `mode` and had every React root write it, which ping-ponged
    // `expanded -> mini -> expanded -> mini` forever and shipped a black
    // player screen. It is derived now, so it must not exist here at all.
    expect(usePresentationStore.getState()).not.toHaveProperty('mode');
  });

  it('exposes no surface-reported flag — the picture is in the tree', () => {
    // `videoSurfacePresented` existed because the surface was mounted OUTSIDE
    // React, so no React-side fact could say whether it was on screen. The
    // picture is a view component now, so the question is structural.
    expect(usePresentationStore.getState()).not.toHaveProperty(
      'videoSurfacePresented',
    );
    expect(usePresentationStore.getState()).not.toHaveProperty(
      'setVideoSurfacePresented',
    );
  });
});