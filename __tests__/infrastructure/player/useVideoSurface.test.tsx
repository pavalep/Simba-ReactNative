/**
 * V21 F4 — `useVideoSurface`, the single owner of native surface
 * presentation.
 *
 * ## What is worth pinning here
 *
 * The hook does two things that are easy to get quietly wrong, and both
 * have a visible failure:
 *
 *   1. **Size, then reveal.** The surface is mounted `GONE` at `0x0`, and a
 *      zero-area `SurfaceView` is an invalid libmpv render target. Revealing
 *      before sizing produces a black frame that looks like a compositor
 *      problem and is not one.
 *   2. **Report what actually happened.** Every native call resolves a real
 *      boolean. The hook publishes it, so `usePresentation` can render `null`
 *      instead of claiming a video is on screen when nothing is.
 *
 * F4 added a third: placement depends on the requested presentation, and a
 * minimised launch with no measured rect must reveal NOTHING rather than
 * fall back to filling the window — a fullscreen video the user asked to
 * minimise and cannot get rid of is worse than no dock at all.
 */

import {renderHook, waitFor} from '@testing-library/react-native';

const mockBridge = {
  fillVideoBounds: jest.fn<Promise<boolean>, []>(),
  setVideoBounds: jest.fn<Promise<boolean>, [number, number, number, number]>(),
  setSurfaceVisible: jest.fn<Promise<boolean>, [boolean]>(),
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  getMpvPlayerModule: () => mockBridge,
}));

import {useVideoSurface} from '../../../src/infrastructure/player/useVideoSurface';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

function setVideoSession() {
  useNowPlayingStore.getState().begin({
    uri: 'file:///movies/namus-kanla-yazilir.mkv',
    title: 'Namus Kanla Yazilir',
    startPositionMs: 0,
    streamType: 'video',
    type: 'video',
    mediaLane: 'video',
  });
}

const RECT = {x: 16, y: 2400, width: 44, height: 44};

describe('useVideoSurface', () => {
  beforeEach(() => {
    mockBridge.fillVideoBounds.mockReset().mockResolvedValue(true);
    mockBridge.setVideoBounds.mockReset().mockResolvedValue(true);
    mockBridge.setSurfaceVisible.mockReset().mockResolvedValue(true);
    useNowPlayingStore.getState().reset();
    usePresentationStore.setState({
      pipActive: false,
      videoSurfacePresented: false,
      videoPresentation: 'expanded',
      videoMiniRect: null,
    });
  });

  // ── expanded ────────────────────────────────────────────────────────

  it('fills the window and reveals when expanded', async () => {
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.fillVideoBounds).toHaveBeenCalledTimes(1));
    expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(true);
    expect(usePresentationStore.getState().videoSurfacePresented).toBe(true);
  });

  it('does NOT reveal when the sizing call refuses', async () => {
    // The black-frame case. A 0x0 surface is an invalid libmpv target, so
    // revealing here would hand the compositor a frame it cannot draw.
    mockBridge.fillVideoBounds.mockResolvedValue(false);
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.fillVideoBounds).toHaveBeenCalled());
    expect(mockBridge.setSurfaceVisible).not.toHaveBeenCalled();
    expect(usePresentationStore.getState().videoSurfacePresented).toBe(false);
  });

  it('reports the surface as not presented when the reveal itself refuses', async () => {
    mockBridge.setSurfaceVisible.mockResolvedValue(false);
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(true));
    expect(usePresentationStore.getState().videoSurfacePresented).toBe(false);
  });

  // ── minimised (F4) ──────────────────────────────────────────────────

  it('places the surface at the measured mini rect instead of filling', async () => {
    usePresentationStore.setState({
      videoPresentation: 'mini',
      videoMiniRect: RECT,
    });
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() =>
      expect(mockBridge.setVideoBounds).toHaveBeenCalledWith(
        RECT.x,
        RECT.y,
        RECT.width,
        RECT.height,
      ),
    );
    // The fallback must NOT run: filling the window would cover the whole
    // screen with video while the user asked for a dock.
    expect(mockBridge.fillVideoBounds).not.toHaveBeenCalled();
    expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(true);
  });

  it('reveals nothing when minimised with no measured rect', async () => {
    // The dock has not measured yet (first frame, or the surface mounted
    // late). Falling back to the window here is the worst available
    // outcome, so the honest answer is: show no video.
    usePresentationStore.setState({
      videoPresentation: 'mini',
      videoMiniRect: null,
    });
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(usePresentationStore.getState().videoSurfacePresented).toBe(false));
    expect(mockBridge.setVideoBounds).not.toHaveBeenCalled();
    expect(mockBridge.fillVideoBounds).not.toHaveBeenCalled();
    expect(mockBridge.setSurfaceVisible).not.toHaveBeenCalled();
  });

  it('re-places the surface when the measured rect changes, as on rotation', async () => {
    usePresentationStore.setState({
      videoPresentation: 'mini',
      videoMiniRect: RECT,
    });
    setVideoSession();
    await renderHook(() => useVideoSurface());
    await waitFor(() => expect(mockBridge.setVideoBounds).toHaveBeenCalledTimes(1));

    const landscape = {x: 20, y: 1000, width: 64, height: 64};
    usePresentationStore.setState({videoMiniRect: landscape});

    await waitFor(() =>
      expect(mockBridge.setVideoBounds).toHaveBeenCalledWith(
        landscape.x,
        landscape.y,
        landscape.width,
        landscape.height,
      ),
    );
  });

  // ── hidden states ───────────────────────────────────────────────────

  it('hides when there is no session at all', async () => {
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(false));
    expect(usePresentationStore.getState().videoSurfacePresented).toBe(false);
  });

  it('never touches the surface for an AUDIO session', async () => {
    // Audio has no render target. mpv keeps playing with the surface GONE,
    // which is the correct configuration — not an oversight to fix.
    useNowPlayingStore.getState().begin({
      uri: 'file:///podcasts/can-ai.mp3',
      title: 'Can AI',
      startPositionMs: 0,
      streamType: 'audio',
      type: 'podcast',
      mediaLane: 'audio',
    });
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(false));
    expect(mockBridge.fillVideoBounds).not.toHaveBeenCalled();
    expect(mockBridge.setVideoBounds).not.toHaveBeenCalled();
  });

  it('hides while PiP owns the surface', async () => {
    usePresentationStore.setState({pipActive: true, videoSurfacePresented: true});
    setVideoSession();
    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(mockBridge.setSurfaceVisible).toHaveBeenCalledWith(false));
    expect(mockBridge.fillVideoBounds).not.toHaveBeenCalled();
  });

  it('reports not-presented when the mockBridge has no surface methods', async () => {
    // The jest/web fallback. Silent is correct — there is no engine to
    // talk to — but the presentation must still be honest.
    mockBridge.fillVideoBounds.mockResolvedValue(false);
    const original = mockBridge.fillVideoBounds;
    (mockBridge as {fillVideoBounds?: unknown}).fillVideoBounds = undefined;
    setVideoSession();

    await renderHook(() => useVideoSurface());

    await waitFor(() => expect(usePresentationStore.getState().videoSurfacePresented).toBe(false));
    expect(mockBridge.setSurfaceVisible).not.toHaveBeenCalled();
    (mockBridge as {fillVideoBounds?: unknown}).fillVideoBounds = original;
  });
});