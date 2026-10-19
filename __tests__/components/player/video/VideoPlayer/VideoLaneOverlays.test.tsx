/**
 * The loading and error overlays live ON THE PICTURE, so the dock shows
 * them.
 *
 * ## The defect this pins
 *
 * Both overlays used to be mounted inside `ExpandedChrome`, which
 * renders only when the player is expanded. So:
 *
 *   - a video that was LOADING or STALLED in the dock showed nothing
 *     (the dock showed a black square), and
 *   - a video whose LOAD FAILED in the dock showed nothing at all —
 *     the user saw a black square with no error and nothing to do.
 *
 * The second one is the "silent black screen" P0, and it was
 * structural rather than a missing condition: a cold-start video
 * begins minimised (`videoPresentation` starts at `'mini'`), so the
 * failure happened in the dock, where the error overlay was not
 * mounted.
 *
 * ## What is asserted
 *
 * Not "the overlay renders" — it did, in the expanded chrome. The
 * claim is structural: the overlays are children of the PICTURE's box,
 * which is the only thing that is present in both presentations, and
 * they are still there when the chrome subtree is gone.
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

jest.mock('../../../../../src/infrastructure/player', () => {
  // The REAL `usePresentation` — the test changes the real store and
  // reads the real derivation.
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

  it('mounts both overlays inside the PICTURE’s box', async () => {
    // The picture's box is the only thing present in BOTH
    // presentations, so it is the only correct home for an overlay
    // that has to work in both.
    const result = await render(<VideoPlayer />);
    const tree = result.toJSON() as {
      children: Array<{props: {style?: unknown}; children: unknown[]}>;
    };
    const pictureBox = tree.children[0];

    const childTestIDs = pictureBox.children.map(
      child => (child as {props: {testID?: string}}).props.testID,
    );
    expect(childTestIDs).toContain('picture');
    expect(childTestIDs).toContain('loading-overlay');
    expect(childTestIDs).toContain('error-overlay');
    result.unmount();
  });

  it('keeps the overlays when the chrome is gone (the dock)', async () => {
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setVideoPresentation('mini');
    });

    // The chrome subtree is gone — only the picture's box is left.
    const tree = result.toJSON() as {children: unknown[]};
    expect(tree.children).toHaveLength(1);

    // And the overlays are still on the picture. Before this change
    // they were inside the chrome, so in the dock there was nothing
    // at all: a stalled load and a failed load both looked like a
    // black square.
    expect(screen.getByTestId('loading-overlay')).toBeTruthy();
    expect(screen.getByTestId('error-overlay')).toBeTruthy();
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
});
