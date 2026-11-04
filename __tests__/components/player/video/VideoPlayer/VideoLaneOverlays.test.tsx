/**
 * The loading and error overlays live under the CHROME ROOT, and the
 * picture's box holds nothing but the picture.
 *
 * ## Why the composition moved
 *
 * The library hides ONE view when the Activity enters
 * Picture-in-Picture: the app's expanded chrome root, found by its
 * `nativeID` and hidden with a native `visibility = GONE`. Anything
 * that is a SIBLING of that root survives that hide.
 *
 * The overlays used to be siblings of the chrome root — children of the
 * picture's box — because they had to be visible in the DOCK, where the
 * chrome does not exist at all. A cold-start video begins minimised, so
 * a cold-start LOAD FAILURE was a black square in the dock with no
 * error and no way to act.
 *
 * They now live INSIDE the chrome root, which is what makes "one GONE
 * leaves only the picture" true: a spinner or an error card can no
 * longer be painted into the PiP window.
 *
 * The cost is the dock. The chrome root exists only in the expanded
 * presentation, so the dock shows no loading state and no error. The
 * error is still reachable — tapping the dock expands the player, where
 * the card with Retry and Close is shown — but it is no longer shown
 * at a glance in the 44 pt slot. That is the price of a correct PiP
 * window, and it is recorded here so the next reader knows it was a
 * decision and not an accident.
 *
 * ## What is asserted
 *
 * Not "the overlay renders" — it did, in the expanded chrome. The claim
 * is structural: the overlays and the gesture layer are INSIDE the
 * chrome root, and the picture's box — the chrome root's sibling —
 * holds the surface and nothing else.
 */

import * as React from 'react';
import {act, render, screen} from '@testing-library/react-native';

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
  // The REAL `usePresentation` — the test changes the real store and
  // reads the real derivation.
  const realPipEntry = jest.requireActual(
    '../../../../../src/infrastructure/player/usePipEntry',
  );
  const real = jest.requireActual(
    '../../../../../src/infrastructure/player/usePresentation',
  );
  return {
    usePresentation: real.usePresentation,
    usePipEntry: realPipEntry.usePipEntry,
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

jest.mock(
  '../../../../../src/components/player/video/VideoSurface/VideoSurface',
  () => {
    const {createElement} = require('react');
    return {
      VideoSurface: (props: {resizeMode?: string}) =>
        createElement('Picture', {testID: 'picture', resizeMode: props.resizeMode}),
    };
  },
);

// The overlays are mocked as VISIBLE host elements, so the test can ask
// where they are. A null-rendering mock would make the whole question
// unanswerable.
jest.mock(
  '../../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay',
  () => {
    const {createElement} = require('react');
    return {
      VideoLoadingOverlay: () => createElement('LoadingOverlay', {testID: 'loading-overlay'}),
    };
  },
);
jest.mock(
  '../../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay',
  () => {
    const {createElement} = require('react');
    return {
      VideoErrorOverlay: () => createElement('ErrorOverlay', {testID: 'error-overlay'}),
    };
  },
);

const passthrough = () => null;
jest.mock('../../../../../src/components/player/video/PlayerScrim/PlayerScrim', () => ({
  PlayerScrim: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoTitleOverlay/VideoTitleOverlay', () => ({
  VideoTitleOverlay: passthrough,
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
// The gesture layer is mocked as a VISIBLE host element so the test can
// ask WHERE it sits. It is a native gesture view, so its z-order is
// load-bearing — see the test that pins it.
jest.mock('../../../../../src/components/player/video/Gestures/VerticalSwipeGestures', () => {
  const {createElement} = require('react');
  return {
    VerticalSwipeGestures: () => createElement('GestureLayer', {testID: 'gesture-layer'}),
  };
});
jest.mock('../../../../../src/components/player/video/NextUp/NextUpOverlay', () => ({
  NextUpOverlay: passthrough,
}));
jest.mock('../../../../../src/components/StatusBar', () => ({
  SimbaStatusBar: passthrough,
}));

import {VideoPlayer} from '../../../../../src/components/player/video/VideoPlayer/VideoPlayer';
import {usePresentationStore} from '../../../../../src/state/usePresentationStore';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';

describe('the video lane carries the loading and error overlays', () => {
  beforeEach(() => {
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

  it('mounts both overlays inside the CHROME root', async () => {
    // The chrome root is the ONE view the library hides when the
    // Activity enters Picture-in-Picture. A sibling of it survives that
    // hide and keeps painting into the PiP window, so the overlays have
    // to be INSIDE it.
    const result = await render(<VideoPlayer />);
    const tree = result.toJSON() as {
      children: Array<{props: {testID?: string}; children: unknown[]}>;
    };
    const chromeRoot = tree.children[1];

    const childTestIDs = chromeRoot.children.map(
      child => (child as {props: {testID?: string}}).props.testID,
    );
    expect(childTestIDs).toContain('loading-overlay');
    expect(childTestIDs).toContain('error-overlay');
    result.unmount();
  });

  it('keeps the gesture layer and the overlays OUT of the picture’s box', async () => {
    // The picture's box is a SIBLING of the chrome root, so a sibling is
    // exactly what survives the library's hide. The picture's box holds
    // the surface and nothing else.
    const result = await render(<VideoPlayer />);
    const tree = result.toJSON() as {
      children: Array<{props: {testID?: string}; children: unknown[]}>;
    };
    const pictureBox = tree.children[0];

    const childTestIDs = pictureBox.children.map(
      child => (child as {props: {testID?: string}}).props.testID,
    );
    expect(childTestIDs).toEqual(['picture']);
    result.unmount();
  });

  it('takes the overlays with the chrome (the dock)', async () => {
    // The chrome root exists only in the expanded presentation, so the
    // overlays exist only there. This is a DELIBERATE consequence of
    // the move: the dock's 44 pt slot no longer shows a loading or an
    // error state, and the failure surfaces when the player is
    // expanded. See the module docblock.
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    // The chrome subtree is gone — only the picture's box is left.
    const tree = result.toJSON() as {children: unknown[]};
    expect(tree.children).toHaveLength(1);

    expect(screen.queryByTestId('loading-overlay')).toBeNull();
    expect(screen.queryByTestId('error-overlay')).toBeNull();
    result.unmount();
  });

  it('keeps the overlays when the video is expanded again', async () => {
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });
    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('expanded');
    });

    expect(screen.getByTestId('loading-overlay')).toBeTruthy();
    expect(screen.getByTestId('error-overlay')).toBeTruthy();
    result.unmount();
  });

  /**
   * The z-order claim.
   *
   * `VerticalSwipeGestures` is an RNGH `GestureDetector` — a NATIVE view
   * that claims the touches in its bounds. It used to live in
   * `ExpandedChrome`, a later sibling of the picture's box, so it was
   * painted ABOVE the picture and above both overlays.
   *
   * Device evidence (2026-10-20, emulator-5554): with the error card up,
   * pressing "Retry" produced no second `loadFile` in the native trace,
   * and "Close" did not stop playback — while the transport bar's "Mute",
   * which is a LATER sibling of the gesture layer, worked. The card's
   * buttons were dead because the gesture layer was above them.
   *
   * The fix is the layering every shipping video player uses:
   * picture → gesture layer → transient overlays → chrome.
   */
  it('puts the gesture layer BELOW the overlays, so their controls are pressable', async () => {
    const result = await render(<VideoPlayer />);
    const tree = result.toJSON() as {
      children: Array<{props: {testID?: string}; children: unknown[]}>;
    };
    const chromeRoot = tree.children[1];

    const childTestIDs = chromeRoot.children.map(
      child => (child as {props: {testID?: string}}).props.testID,
    );

    const gestureIndex = childTestIDs.indexOf('gesture-layer');
    const loadingIndex = childTestIDs.indexOf('loading-overlay');
    const errorIndex = childTestIDs.indexOf('error-overlay');

    // The gesture layer must be IN the chrome root...
    expect(gestureIndex).toBeGreaterThanOrEqual(0);
    // ...and BELOW both overlays.
    expect(gestureIndex).toBeLessThan(loadingIndex);
    expect(gestureIndex).toBeLessThan(errorIndex);
    result.unmount();
  });

  it('does not mount the gesture layer in the dock', async () => {
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    // In the dock the picture is a 44 pt slot with no chrome to toggle,
    // so a full-screen gesture layer there would be a gesture surface
    // the size of a thumbnail.
    expect(screen.queryByTestId('gesture-layer')).toBeNull();
    result.unmount();
  });
});
