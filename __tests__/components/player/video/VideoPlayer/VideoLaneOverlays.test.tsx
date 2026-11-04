/**
 * The loading and error overlays live under the CHROME ROOT, in BOTH
 * presentations, and the picture's box holds nothing but the picture.
 *
 * ## Why the composition moved
 *
 * The library hides ONE view when the Activity enters Picture-in-Picture:
 * the app's chrome root, found by its `nativeID` and hidden with a native
 * `visibility = GONE`. Anything that is a SIBLING of that root survives that
 * hide.
 *
 * The overlays used to be siblings of the chrome root — children of the
 * picture's box — because they had to be visible in the DOCK, where the
 * chrome does not exist at all. A cold-start video begins minimised, so a
 * cold-start LOAD FAILURE was a black square in the dock with no error and
 * no way to act.
 *
 * They now live INSIDE the chrome root, which is what makes "one GONE
 * leaves only the picture" true: a spinner or an error card can no longer
 * be painted into the PiP window.
 *
 * ## And the chrome root is mounted in BOTH presentations
 *
 * The first version of that move gated the chrome root on
 * `presentation.isExpanded` — and the dock lost its spinner and its error
 * card, because the root that holds them was not there. The root is now
 * ALWAYS mounted, and it takes the PICTURE's rect, so the overlays land
 * exactly where the picture is: full-bleed when expanded, the dock's
 * measured 44 pt slot when minimised.
 *
 * What is expanded-only is the GESTURE LAYER and the chrome's OWN
 * controls. The gesture layer is a full-screen native gesture view; in the
 * dock it would be a gesture surface the size of a thumbnail, with no
 * chrome to toggle.
 *
 * ## What is asserted
 *
 * Not "the overlay renders" — it did, in the expanded chrome. The claim is
 * structural: the chrome root is there in BOTH presentations, the overlays
 * are INSIDE it in BOTH, the gesture layer and the chrome's own controls
 * are inside it and expanded-only, the root carries the picture's rect,
 * and the picture's box — the chrome root's sibling — holds the surface
 * and nothing else.
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
// The status bar is one of the chrome's OWN children, so it is mocked as a
// VISIBLE host element: "the chrome's own controls are expanded-only" is
// only observable if they are in the tree.
jest.mock('../../../../../src/components/StatusBar', () => {
  const {createElement} = require('react');
  return {
    SimbaStatusBar: () => createElement('StatusBar', {testID: 'status-bar'}),
  };
});

import {VideoPlayer} from '../../../../../src/components/player/video/VideoPlayer/VideoPlayer';
import {PIP_CHROME_NATIVE_ID} from '../../../../../src/infrastructure/player/pipChrome';
import {usePresentationStore} from '../../../../../src/state/usePresentationStore';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';

/** One node of the rendered tree. */
interface RenderNode {
  props: {testID?: string; nativeID?: string; style?: unknown};
  children: RenderNode[] | null;
}

/** The rendered tree, typed. */
function treeOf(result: {toJSON: () => unknown}): RenderNode {
  return result.toJSON() as RenderNode;
}

/** The chrome root — the ONE view the library hides. */
function chromeRootOf(tree: RenderNode): RenderNode | null {
  if (tree.props?.nativeID === PIP_CHROME_NATIVE_ID) return tree;
  for (const child of tree.children ?? []) {
    const found = chromeRootOf(child);
    if (found) return found;
  }
  return null;
}

/** The picture's box — the chrome root's sibling, found through the surface. */
function pictureBoxOf(tree: RenderNode): RenderNode | null {
  for (const child of tree.children ?? []) {
    if (child.props?.testID === 'picture') return tree;
    const found = pictureBoxOf(child);
    if (found) return found;
  }
  return null;
}

/** The testIDs of a node's direct children. */
function childTestIDs(node: RenderNode): Array<string | undefined> {
  return (node.children ?? []).map(child => child.props?.testID);
}

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
    const chromeRoot = chromeRootOf(treeOf(result));

    expect(chromeRoot).not.toBeNull();
    expect(childTestIDs(chromeRoot as RenderNode)).toContain('loading-overlay');
    expect(childTestIDs(chromeRoot as RenderNode)).toContain('error-overlay');
    result.unmount();
  });

  it('mounts the CHROME root in BOTH presentations', async () => {
    // The chrome root is where the library's one `GONE` lands, so it has
    // to EXIST for that to mean anything — in the dock too, because the
    // dock's spinner and its error card are drawn in it.
    const result = await render(<VideoPlayer />);

    expect(chromeRootOf(treeOf(result))).not.toBeNull();

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    expect(chromeRootOf(treeOf(result))).not.toBeNull();
    result.unmount();
  });

  it('keeps the gesture layer and the overlays OUT of the picture’s box', async () => {
    // The picture's box is a SIBLING of the chrome root, so a sibling is
    // exactly what survives the library's hide. The picture's box holds
    // the surface and nothing else.
    const result = await render(<VideoPlayer />);
    const pictureBox = pictureBoxOf(treeOf(result));

    expect(pictureBox).not.toBeNull();
    expect(childTestIDs(pictureBox as RenderNode)).toEqual(['picture']);
    result.unmount();
  });

  it('keeps the overlays in the DOCK, inside the chrome root', async () => {
    // The regression this guards: the chrome root was gated on
    // `presentation.isExpanded`, so the dock's 44 pt slot showed no
    // spinner and no error card — and a cold-start video begins minimised,
    // so a cold-start LOAD FAILURE was a black square with no way to act.
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    const chromeRoot = chromeRootOf(treeOf(result));
    expect(chromeRoot).not.toBeNull();
    expect(childTestIDs(chromeRoot as RenderNode)).toContain('loading-overlay');
    expect(childTestIDs(chromeRoot as RenderNode)).toContain('error-overlay');

    expect(screen.getByTestId('loading-overlay')).toBeTruthy();
    expect(screen.getByTestId('error-overlay')).toBeTruthy();
    result.unmount();
  });

  it('mounts the chrome’s OWN children only when expanded', async () => {
    // The status bar, the scrim, the title, the next-up card and the
    // transport bar are the expanded presentation's. The chrome ROOT stays
    // mounted in the dock — but what is inside it does not.
    const result = await render(<VideoPlayer />);

    let chromeRoot = chromeRootOf(treeOf(result));
    expect(childTestIDs(chromeRoot as RenderNode)).toContain('status-bar');

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    chromeRoot = chromeRootOf(treeOf(result));
    expect(childTestIDs(chromeRoot as RenderNode)).not.toContain('status-bar');
    result.unmount();
  });

  it('gives the chrome root the PICTURE’s rect, in both presentations', async () => {
    // The overlays are drawn in the chrome root, so the root has to be
    // exactly where the picture is. A root that is somewhere else puts
    // the dock's spinner somewhere the video is not.
    const result = await render(<VideoPlayer />);

    let chromeRoot = chromeRootOf(treeOf(result)) as RenderNode;
    let pictureBox = pictureBoxOf(treeOf(result)) as RenderNode;

    expect(chromeRoot.props.style).toEqual(pictureBox.props.style);
    expect(chromeRoot.props.style).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });

    // The dock: the slot the dock measured, in the lane's own coordinates.
    await act(async () => {
      usePresentationStore.setState({
        videoPresentation: 'mini',
        videoMiniRect: {x: 16, y: 1800, width: 44, height: 44},
        videoLaneOrigin: {x: 0, y: 64},
      });
    });

    chromeRoot = chromeRootOf(treeOf(result)) as RenderNode;
    pictureBox = pictureBoxOf(treeOf(result)) as RenderNode;

    expect(chromeRoot.props.style).toEqual(pictureBox.props.style);
    expect(chromeRoot.props.style).toMatchObject({
      position: 'absolute',
      left: 16,
      top: 1736,
      width: 44,
      height: 44,
    });
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
    const chromeRoot = chromeRootOf(treeOf(result)) as RenderNode;

    const ids = childTestIDs(chromeRoot);

    const gestureIndex = ids.indexOf('gesture-layer');
    const loadingIndex = ids.indexOf('loading-overlay');
    const errorIndex = ids.indexOf('error-overlay');
    const chromeIndex = ids.indexOf('status-bar');

    // The gesture layer must be IN the chrome root...
    expect(gestureIndex).toBeGreaterThanOrEqual(0);
    // ...and BELOW both overlays.
    expect(gestureIndex).toBeLessThan(loadingIndex);
    expect(gestureIndex).toBeLessThan(errorIndex);
    // The chrome's own controls are above all three.
    expect(errorIndex).toBeLessThan(chromeIndex);
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
