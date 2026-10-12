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
 */

import {useCallback, useEffect} from 'react';
import {logger} from '../../lib/logger';
import {getMpvPlayerModule} from './playbackFacade';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {usePresentationStore} from '../../state/usePresentationStore';

export function useVideoSurface(): void {
  const session = useNowPlayingStore(s => s.current);
  const pipActive = usePresentationStore(s => s.pipActive);
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
  }, [shouldShow, hide, setVideoSurfacePresented]);

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