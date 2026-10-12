/**
 * V21 F3 — the single owner of the native video surface's presentation.
 *
 * ## Why one owner
 *
 * `MainActivity` mounts the render surface once, and from then on every
 * size/visibility decision flows through here. Two components calling
 * `setSurfaceVisible` with their own ideas of "should video be visible" is
 * two owners of one fact — the exact shape that produced W5's disagreeing
 * `videoState` fields, and W6.0's black screen. There is one writer.
 *
 * ## Order is load-bearing
 *
 * Showing is always **size, then reveal**. The surface is mounted at `0x0`
 * (see `PlayerSurface.mount`), and a zero-sized `SurfaceView` is an invalid
 * render target for libmpv. Revealing before sizing hands mpv a surface with
 * no area; `setVideoBounds` refuses non-positive extents precisely because
 * clamping one here would hide a real layout bug behind a plausible black
 * frame.
 *
 * ## The outcome is reported, not assumed
 *
 * Every call here resolves a real boolean. A surface that is not mounted, a
 * caller off the main thread, and a mutation that throws all resolve `false`,
 * and this hook publishes that `false`. `usePresentation()` then reports
 * 'mini' and the video chrome renders `null` — rather than the app claiming a
 * video is on screen when nothing is.
 *
 * ## Where the surface goes, and why this hook decides
 *
 * V21 F4: placement depends on the requested presentation. Expanded fills
 * the window (`MATCH_PARENT`, which Android's own layout then keeps correct
 * across rotation for free). Minimised places the surface at the mini
 * player's measured window rect.
 *
 * It is decided here rather than by the `MiniPlayer` because this hook is
 * already the single owner of every mutation to this surface, and a second
 * component with its own idea of the geometry is how the W5/W6 disagreeing
 * state fields happened. The `MiniPlayer` therefore only *measures* — it
 * publishes a rect and this hook consumes it.
 *
 * A minimised launch with no measured rect reveals nothing. `setVideoBounds`
 * refuses non-positive extents because a 0x0 `SurfaceView` is an invalid
 * libmpv target, so silently falling back to "fill the window" here would
 * turn a missing dock into a fullscreen video the user cannot dismiss.
 */

import {useCallback, useEffect} from 'react';
import {logger} from '../../lib/logger';
import {getMpvPlayerModule} from './playbackFacade';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {usePresentationStore} from '../../state/usePresentationStore';

export function useVideoSurface(): void {
  const session = useNowPlayingStore(s => s.current);
  const pipActive = usePresentationStore(s => s.pipActive);
  const videoPresentation = usePresentationStore(s => s.videoPresentation);
  const videoMiniRect = usePresentationStore(s => s.videoMiniRect);
  const setVideoSurfacePresented = usePresentationStore(
    s => s.setVideoSurfacePresented,
  );

  // Video only. An audio session has no render target — mpv keeps playing
  // with the surface GONE, which is the correct configuration for audio and
  // is why `setSurfaceVisible(false)` exists at all.
  const shouldShow = session != null && session.streamType === 'video' && !pipActive;

  const hide = useCallback(async () => {
    const bridge = getMpvPlayerModule();
    if (typeof bridge?.setSurfaceVisible !== 'function') return false;
    try {
      return await bridge.setSurfaceVisible(false);
    } catch (e) {
      logger.warn('[videoSurface] hide failed', e);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const bridge = getMpvPlayerModule();
      if (typeof bridge?.fillVideoBounds !== 'function') {
        // A bridge without these is the jest/web fallback. Silent is correct
        // here: there is no engine to talk to, not a failure to report.
        if (!cancelled) setVideoSurfacePresented(false);
        return;
      }

      if (!shouldShow) {
        const hidden = await hide();
        if (!cancelled) setVideoSurfacePresented(false);
        if (!hidden) {
          logger.warn('[videoSurface] could not hide the surface');
        }
        return;
      }

      // Size first, then reveal — see the module docstring.
      let sized = false;
      if (videoPresentation === 'mini') {
        // V21 F4. The mini player's rect is the ONLY correct placement: the
        // surface composites at `android.R.id.content` index 0, i.e. beneath
        // the whole React tree, so "wherever the dock is" has to be told to
        // it in window pixels. There is no fallback to filling the window —
        // a full-bleed surface while the user asked for a 44pt dock is
        // exactly the lie this hook exists to avoid.
        if (videoMiniRect == null) {
          logger.warn('[videoSurface] minimised with no measured rect; not revealing');
          if (!cancelled) setVideoSurfacePresented(false);
          return;
        }
        try {
          sized = await bridge.setVideoBounds(
            videoMiniRect.x,
            videoMiniRect.y,
            videoMiniRect.width,
            videoMiniRect.height,
          );
        } catch (e) {
          logger.warn('[videoSurface] setVideoBounds failed', e);
        }
        if (!sized) {
          logger.warn('[videoSurface] setVideoBounds refused; not revealing');
          if (!cancelled) setVideoSurfacePresented(false);
          return;
        }
      } else {
        try {
          sized = await bridge.fillVideoBounds();
        } catch (e) {
          logger.warn('[videoSurface] fillVideoBounds failed', e);
        }
        if (!sized) {
          // No bounds ⇒ no area ⇒ mpv has nothing valid to render into.
          // Refuse to reveal rather than showing a surface that cannot work.
          logger.warn('[videoSurface] fillVideoBounds refused; not revealing');
          if (!cancelled) setVideoSurfacePresented(false);
          return;
        }
      }

      let shown = false;
      try {
        shown = await bridge.setSurfaceVisible(true);
      } catch (e) {
        logger.warn('[videoSurface] setSurfaceVisible(true) failed', e);
      }
      if (!cancelled) setVideoSurfacePresented(shown);
      if (!shown) {
        logger.warn('[videoSurface] setSurfaceVisible(true) refused');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    shouldShow,
    hide,
    setVideoSurfacePresented,
    videoPresentation,
    videoMiniRect,
  ]);

  // Teardown: leaving this tree must not leave a visible surface behind a
  // window that is going away. The cleanup returns void deliberately — an
  // effect destructor must be synchronous, and a returned Promise is both a
  // type error and a floating rejection.
  useEffect(
    () => () => {
      void hide();
    },
    [hide],
  );
}