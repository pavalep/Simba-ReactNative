/**
 * D9 — the video lane's picture is MOVED, never replaced.
 *
 * ## The contract
 *
 * One `<SimbaVideo>` per lane, mounted for as long as a video is loaded.
 * Fullscreen and the dock differ by a `style` on the wrapper, never by which
 * component is in the tree.
 *
 * ## Why this needs its own test
 *
 * Every other suite in this area passed with the old structure. The old
 * `VideoPlayerChrome` returned `null` unless the video was expanded, so
 * minimising it UNMOUNTED the picture — and no test noticed, because
 * nothing asserted the picture's continued existence.
 *
 * The failure it would cause is specific and severe: the lib's
 * `attachSurfaceLocked` rebinds the mpv surface on every `setNativePtr`, and
 * `MpvRenderView.onDropViewInstance` releases the surface binding. An
 * unmount-and-remount therefore tears the surface down and rebuilds it —
 * which is a black frame, a lost `videoReconfig`, and a window where the
 * picture is not attached to the engine at all.
 *
 * So the assertion here is not "the picture is rendered" — it is "the picture
 * was never unmounted", which is a different and stronger claim.
 *
 * ## How it is observed
 *
 * The mocked `VideoSurface` counts its own mounts and unmounts. That is
 * deliberately not a proxy for "the element is in the tree": an element can
 * be present before and after a remount and the count would still be
 * balanced. The COUNT is the evidence.
 */

import * as React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';

const mockCommands: Record<string, jest.Mock> = {
  play: jest.fn(),
  pause: jest.fn(),
  togglePlayPause: jest.fn(),
  seek: jest.fn(),
  seekBy: jest.fn(),
  forward10: jest.fn(),
  rewind10: jest.fn(),
  setVolume: jest.fn(),
  setSpeed: jest.fn(),
  setProperty: jest.fn(),
  setRepeatMode: jest.fn(),
  setShuffle: jest.fn(),
  selectCaptionTrack: jest.fn(),
  close: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
};

// V22 W22 (2026-10-21): the CLOSE verb is owned by `useClosePlayback()`,
// and it reports a refused native stop through the app's toast. The app
// ALWAYS renders the player chrome inside the root `ToastProvider`, so a
// suite that renders the chrome without one is rendering a state the app
// cannot be in — and `useToast` throws rather than pretending. These
// suites are not about toasts.
jest.mock('../../../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: jest.fn(), hide: jest.fn()}),
}));
jest.mock('../../../../../src/infrastructure/player', () => {
  // The REAL `usePresentation` — the test changes the real store and reads
  // the real derivation. A mocked presentation would let the test assert
  // against a fiction.
  const real = jest.requireActual(
    '../../../../../src/infrastructure/player/usePresentation',
  );
  return {
    usePresentation: real.usePresentation,
    useTransport: () => ({
      state: {
        currentUri: 'file:///movies/film.mkv',
        title: 'Film',
        durationMs: 600_000,
        positionMs: 42_000,
        isPlaying: true,
        isBuffering: false,
        isSeeking: false,
        seekable: true,
        speed: 1,
        volume: 100,
        isMuted: false,
      },
      commands: mockCommands,
    }),
    useChromeAutoHide: () => ({toggle: jest.fn()}),
    usePipBridge: () => undefined,
    useCaptionStyleBridge: () => undefined,
    ChromeAutoHideProvider: ({children}: {children: React.ReactNode}) => (
      <>{children}</>
    ),
  };
});

jest.mock('../../../../../src/state/useQualityStore', () => ({
  presetToMpv: (preset: string) => ({
    hwdec: `${preset}-hwdec`,
    profile: `${preset}-profile`,
  }),
  useQualityStore: (sel: (s: unknown) => unknown) =>
    sel({setPreset: jest.fn()}),
}));

jest.mock('../../../../../src/state/useSkipSilenceStore', () => ({
  useSkipSilenceStore: {getState: () => ({setEnabled: jest.fn()})},
}));

/** Mount/unmount counters for the picture. THE evidence. */
let mockPictureMounts = 0;
let mockPictureUnmounts = 0;

jest.mock(
  '../../../../../src/components/player/video/VideoSurface/VideoSurface',
  () => {
    // `require` is one of the identifiers a `jest.mock` factory may close
    // over; a bare `React` binding is not. (The sibling `VideoPlayerRef`
    // suite appears to reference `React` inside a factory, but only as a
    // TYPE — `React.ReactNode` — which is erased at compile time, so it
    // never became a runtime reference. Adding a real one fails the
    // hoisting check with "Invalid variable access: React".)
    const {useEffect, createElement} = require('react');
    return {
      VideoSurface: (props: {resizeMode?: string}) => {
        useEffect(() => {
          mockPictureMounts += 1;
          return () => {
            mockPictureUnmounts += 1;
          };
        }, []);
        // A string type, so this is a HOST element with a testID and not
        // a reference to a component that does not exist. JSX would compile
        // to an identifier reference, which the hoisting check rejects.
        //
        // `resizeMode` is forwarded so the fit mode is observable: the dock
        // slot is square, so a `contain` fit there would letterbox the
        // video into a thin strip.
        return createElement('Picture', {
          testID: 'picture',
          resizeMode: props.resizeMode,
        });
      },
    };
  },
);

// The chrome primitives render null — this suite is about the picture's
// lifecycle, not the visual tree.
const passthrough = () => null;
jest.mock('../../../../../src/components/player/video/PlayerScrim/PlayerScrim', () => ({
  PlayerScrim: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoTitleOverlay/VideoTitleOverlay', () => ({
  VideoTitleOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay', () => ({
  VideoLoadingOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay', () => ({
  VideoErrorOverlay: passthrough,
}));
// V22 W22 (2026-10-21): the video lane's own dock. It is chrome, and
// these suites are about the picture's lifecycle — so it renders null
// here, exactly like the other chrome primitives above.
jest.mock('../../../../../src/components/player/video/VideoDock/VideoDock', () => ({
  VideoDock: () => null,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/TransportBar', () => ({
  TransportBar: passthrough,
}));
jest.mock('../../../../../src/components/player/video/ChromeAutoHide/ChromeAutoHideController', () => ({
  ChromeAutoHideController: passthrough,
}));
jest.mock('../../../../../src/components/player/video/Gestures/VerticalSwipeGestures', () => ({
  VerticalSwipeGestures: passthrough,
}));
jest.mock('../../../../../src/components/player/video/NextUp/NextUpOverlay', () => ({
  NextUpOverlay: passthrough,
}));
jest.mock('../../../../../src/components/StatusBar', () => ({
  SimbaStatusBar: passthrough,
}));

import {VideoPlayer} from '../../../../../src/components/player/video/VideoPlayer/VideoPlayer';
import {usePresentationStore} from '../../../../../src/state/usePresentationStore';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';

async function mountLane() {
  // No `createNodeMock`: React Native Testing Library v14 REMOVED it, so a
  // host component cannot be given a `measureInWindow` in a test. The
  // window→lane arithmetic therefore lives in `dockStyleFor`, which is a
  // pure function and is unit-tested directly.
  const result = await render(<VideoPlayer />);
  return result;
}


describe('D9 — the video lane', () => {
  beforeEach(() => {
    mockPictureMounts = 0;
    mockPictureUnmounts = 0;
    usePresentationStore.setState({
      pipActive: false,
      videoPresentation: 'expanded',
      videoMiniRect: null,
      videoLaneOrigin: null,
    });
    useNowPlayingStore.setState({
      current: {
        streamType: 'video',
        uri: 'file:///movies/film.mkv',
        title: 'Film',
      },
    } as never);
  });

  describe('the picture is never unmounted by a presentation change', () => {
    it('survives expanded -> mini', async () => {
      const result = await mountLane();
      expect(mockPictureMounts).toBe(1);

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('mini');
      });

      expect(mockPictureUnmounts).toBe(0);
      expect(mockPictureMounts).toBe(1);
      expect(screen.getByTestId('picture')).toBeTruthy();
      result.unmount();
    });

    it('survives mini -> expanded', async () => {
      usePresentationStore.setState({videoPresentation: 'mini'});
      const result = await mountLane();
      expect(mockPictureMounts).toBe(1);

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('expanded');
      });

      expect(mockPictureUnmounts).toBe(0);
      expect(mockPictureMounts).toBe(1);
      result.unmount();
    });

    it('survives a round trip through PiP', async () => {
      const result = await mountLane();
      expect(mockPictureMounts).toBe(1);

      await act(async () => {
        usePresentationStore.getState().setPipActive(true);
      });
      await act(async () => {
        usePresentationStore.getState().setPipActive(false);
      });

      expect(mockPictureUnmounts).toBe(0);
      expect(mockPictureMounts).toBe(1);
      result.unmount();
    });
  });

  describe('the picture is mounted only while a video is loaded', () => {
    it('is absent with no session', async () => {
      useNowPlayingStore.setState({current: null} as never);
      const result = await mountLane();

      expect(mockPictureMounts).toBe(0);
      expect(screen.queryByTestId('picture')).toBeNull();
      result.unmount();
    });

    it('is absent for an AUDIO session — the lanes do not share a picture', async () => {
      useNowPlayingStore.setState({
        current: {streamType: 'audio', uri: 'file:///podcasts/ep.mp3'},
      } as never);
      const result = await mountLane();

      expect(mockPictureMounts).toBe(0);
      result.unmount();
    });
  });

  describe('the picture is MOVED, not replaced', () => {
    it('is full-bleed when expanded', async () => {
      const result = await mountLane();
      const tree = result.toJSON() as {
        children: Array<{props: {style?: unknown}}>;
      };
      const wrapper = tree.children[0].props.style as Record<string, unknown>;

      expect(wrapper).toMatchObject({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      });
      result.unmount();
    });

    it('is placed at the dock slot, in the lane’s own coordinates', async () => {
      // The two published measurements: the dock's slot and the lane's
      // origin, both in WINDOW pixels. The picture's box is relative to
      // the lane, so the slot has to be converted — `top` 1800 in the
      // window is 1736 in a lane that starts 64px down.
      //
      // This is the assertion that says the picture is MOVED. Without it,
      // a lane that simply ignored the dock rect would still pass every
      // other test in this file: the picture would be present, still
      // mounted, and still full-bleed — the video would cover the screen
      // while "minimised".
      usePresentationStore.setState({
        videoPresentation: 'mini',
        videoMiniRect: {x: 16, y: 1800, width: 96, height: 96},
        videoLaneOrigin: {x: 0, y: 64},
      });
      const result = await mountLane();
      const tree = result.toJSON() as {
        children: Array<{props: {style?: unknown}}>;
      };
      const wrapper = tree.children[0].props.style as Record<string, unknown>;

      expect(wrapper).toMatchObject({
        position: 'absolute',
        left: 16,
        top: 1736,
        width: 96,
        height: 96,
      });
      // The dock's box is exact: `right`/`bottom` would over-constrain it.
      expect(wrapper.right).toBeUndefined();
      expect(wrapper.bottom).toBeUndefined();
      result.unmount();
    });

    it('stays full-bleed when the dock rect is known but the lane origin is not', async () => {
      // One measurement without the other is not enough to place the
      // picture, and guessing is not an option.
      usePresentationStore.setState({
        videoPresentation: 'mini',
        videoMiniRect: {x: 16, y: 1800, width: 96, height: 96},
        videoLaneOrigin: null,
      });
      const result = await mountLane();
      const tree = result.toJSON() as {
        children: Array<{props: {style?: unknown}}>;
      };
      const wrapper = tree.children[0].props.style as Record<string, unknown>;

      expect(wrapper).toMatchObject({top: 0, left: 0, right: 0, bottom: 0});
      result.unmount();
    });

    it('returns to full-bleed when the video is expanded again', async () => {
      // The round trip: minimised → placed in the dock → expanded → back to
      // full screen. The dock's rect is still published while expanded (the
      // dock does not tear down just because the video came back), so a
      // placement that is not cleared on the way out would leave the video
      // stuck in a 96x96 box in the corner of a fullscreen player.
      usePresentationStore.setState({
        videoPresentation: 'mini',
        videoMiniRect: {x: 16, y: 1800, width: 96, height: 96},
        videoLaneOrigin: {x: 0, y: 64},
      });
      const result = await mountLane();

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('expanded');
      });

      const tree = result.toJSON() as {
        children: Array<{props: {style?: unknown}}>;
      };
      const wrapper = tree.children[0].props.style as Record<string, unknown>;

      expect(wrapper).toMatchObject({top: 0, left: 0, right: 0, bottom: 0});
      expect(mockPictureUnmounts).toBe(0);
      result.unmount();
    });

    it('keeps the picture mounted when the dock has not published a rect yet', async () => {
      // The window between "the user minimised" and "the dock has measured
      // itself". A 0x0 picture is an invalid libmpv render target, so the
      // picture must STAY where it is rather than collapse.
      const result = await mountLane();

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('mini');
      });

      expect(mockPictureUnmounts).toBe(0);
      expect(mockPictureMounts).toBe(1);
      result.unmount();
    });
  });

  describe('the chrome comes and goes; the picture does not', () => {
    it('has no chrome sibling when minimised', async () => {
      const result = await mountLane();
      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('mini');
      });

      const tree = result.toJSON() as {children: unknown[]};
      // The picture is the only child; the chrome subtree is gone.
      expect(tree.children).toHaveLength(1);
      expect(mockPictureMounts).toBe(1);
      result.unmount();
    });

    it('fits the frame to the slot it is in', async () => {
      // The dock slot is square. A `contain` fit there letterboxes the
      // frame into a thin strip, so the dock wants `cover` and fullscreen
      // wants `contain` (bars, not a crop).
      const result = await mountLane();
      expect(screen.getByTestId('picture').props.resizeMode).toBe('contain');

      await act(async () => {
        usePresentationStore.getState().setVideoPresentation('mini');
      });

      expect(screen.getByTestId('picture').props.resizeMode).toBe('cover');
      result.unmount();
    });
  });
});