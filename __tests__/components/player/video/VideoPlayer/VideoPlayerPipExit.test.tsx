/// <reference types="node" />
/**
 * PiP EXIT must bring the chrome back.
 *
 * ## The defect this exists to prevent
 *
 * `usePipBridge()` was mounted inside `ExpandedChrome`, and `ExpandedChrome`
 * is gated on `presentation.isExpanded`:
 *
 *     mode = pipActive ? 'pip' : (expanded ? 'expanded' : 'mini')
 *     isExpanded = mode === 'expanded'
 *
 * So entering PiP (`pipActive = true`) made the mode `'pip'`, which made
 * `isExpanded` false, which UNMOUNTED the component that owned the
 * `onPipModeChanged` subscription. The listener that reports "PiP has ended"
 * was therefore destroyed by the act of entering PiP.
 *
 * When the user left PiP, the native side did everything right —
 * `onPictureInPictureModeChanged: isInPip=false` and `emit succeeded` — and
 * the event still had no subscriber. `pipActive` stayed `true` for good, so
 * the mode stayed `'pip'`, so the fullscreen player came back with no
 * transport bar, no top bar, and no way out. That is what the user saw on
 * device: "it got stuck in fullscreen, no trackbar, no top bar etc".
 *
 * ## Why the unit test could not see it
 *
 * `__tests__/infrastructure/player/usePipBridge.test.ts` tests the hook in
 * isolation, and the hook is CORRECT in isolation — it subscribes to all
 * four events and clears the flag on `isInPip: false`. The bug is in WHERE
 * it is mounted, and a hook test has no tree to mount it in.
 *
 * So this suite renders the real `<VideoPlayer />` with the real
 * `usePipBridge` and the real `usePresentation` (real store, real
 * derivation) and only replaces the LIB's event emitter — the one thing
 * whose behaviour on a real device is not reproducible in a unit test.
 *
 * ## The rule this pins
 *
 * A listener that reconciles a state must not be mounted inside a subtree
 * that the state unmounts.
 */

import * as React from 'react';
import {act, render, screen} from '@testing-library/react-native';

type Handler = (payload: unknown) => void;

/**
 * The lib's event emitter, replaced by a recorder. This is the ONLY thing
 * mocked on the lib side: the native side of a PiP transition cannot be
 * reproduced in a unit test, and the event it produces is the input the
 * whole reconciliation turns on.
 */
const mockPiPHandlers = new Map<string, Handler>();
const mockUnsubscribed: string[] = [];

jest.mock('@simba-dev/react-native-media-player', () => ({
  subscribePlayerEvent: (event: string, handler: Handler) => {
    mockPiPHandlers.set(event, handler);
    return () => {
      mockUnsubscribed.push(event);
      mockPiPHandlers.delete(event);
    };
  },
}));

const mockCommands: Record<string, jest.Mock> = {
  play: jest.fn(),
  pause: jest.fn(),
  close: jest.fn(),
  exitPip: jest.fn(),
  enterPip: jest.fn(),
  setProperty: jest.fn(),
};

jest.mock('../../../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({
    state: {
      isPlaying: true,
      isEnded: false,
      isBuffering: false,
      canEnterPip: true,
      currentUri: 'file:///movies/film.mkv',
      title: 'Film',
      durationMs: 600_000,
      positionMs: 42_000,
      seekable: true,
      speed: 1,
      volume: 100,
      isMuted: false,
    },
    commands: mockCommands,
  }),
}));

/**
 * The app's player barrel, with the REAL PiP bridge and the REAL
 * presentation derivation.
 *
 * The bridge and the presentation store are the two halves of the
 * contract, so both are real here: a mocked presentation would let the
 * test assert against a fiction, exactly as the sibling
 * `VideoLanePresentation` suite says of itself.
 */
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
  const actualPipBridge = jest.requireActual(
    '../../../../../src/infrastructure/player/usePipBridge',
  );
  const actualPresentation = jest.requireActual(
    '../../../../../src/infrastructure/player/usePresentation',
  );
  const {createElement, Fragment} = require('react');
  return {
    usePipBridge: actualPipBridge.usePipBridge,
    usePresentation: actualPresentation.usePresentation,
    useTransport: () => ({
      state: {
        isPlaying: true,
        isEnded: false,
        isBuffering: false,
        canEnterPip: true,
        currentUri: 'file:///movies/film.mkv',
        title: 'Film',
        durationMs: 600_000,
        positionMs: 42_000,
        seekable: true,
      },
      commands: mockCommands,
    }),
    useChromeAutoHide: () => ({
      toggle: jest.fn(),
      kick: jest.fn(),
      isVisible: true,
      isDismissible: true,
      opacity: {setValue: jest.fn()},
      progress: {setValue: jest.fn()},
    }),
    useCaptionStyleBridge: () => [],
    ChromeAutoHideProvider: ({children}: {children: React.ReactNode}) =>
      createElement(Fragment, null, children),
  };
});

/**
 * The transport bar renders a MARKER rather than nothing, so "the chrome is
 * back" is an observable fact about the tree rather than an inference from
 * the absence of an error.
 */
jest.mock(
  '../../../../../src/components/player/video/TransportBar/TransportBar',
  () => {
    const {createElement} = require('react');
    return {
      TransportBar: () => createElement('TransportBar', {testID: 'transport-bar'}),
    };
  },
);

jest.mock(
  '../../../../../src/components/player/video/VideoSurface/VideoSurface',
  () => {
    const {createElement} = require('react');
    return {
      VideoSurface: () => createElement('Picture', {testID: 'picture'}),
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
jest.mock('../../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay', () => ({
  VideoLoadingOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay', () => ({
  VideoErrorOverlay: passthrough,
}));
jest.mock(
  '../../../../../src/components/player/video/ChromeAutoHide/ChromeAutoHideController',
  () => {
    const {createElement, Fragment} = require('react');
    return {
      // It must render its CHILDREN: the transport bar is mounted inside
      // it, and a mock that returned null would hide the very thing this
      // suite asserts on.
      ChromeAutoHideController: ({children}: {children: React.ReactNode}) =>
        createElement(Fragment, null, children),
    };
  },
);
jest.mock('../../../../../src/components/player/video/Gestures/VerticalSwipeGestures', () => ({
  VerticalSwipeGestures: passthrough,
}));
jest.mock('../../../../../src/components/player/video/NextUp/NextUpOverlay', () => ({
  NextUpOverlay: passthrough,
}));
// V22 W22 (2026-10-21): the video lane's own dock. It is chrome, and
// this suite is about the PiP reconciliation — so it renders null here,
// exactly like the other chrome primitives above.
jest.mock('../../../../../src/components/player/video/VideoDock/VideoDock', () => ({
  VideoDock: passthrough,
}));
jest.mock('../../../../../src/components/StatusBar', () => ({
  SimbaStatusBar: passthrough,
}));

import {VideoPlayer} from '../../../../../src/components/player/video/VideoPlayer/VideoPlayer';
import {usePresentationStore} from '../../../../../src/state/usePresentationStore';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';

/**
 * Deliver a native PiP event the way the lib's emitter would, and let React
 * flush the state change it causes.
 */
async function emitNative(event: string, payload: unknown) {
  const handler = mockPiPHandlers.get(event);
  if (!handler) {
    throw new Error(
      `no handler registered for ${event} — the PiP reconciliation is not listening`,
    );
  }
  await act(async () => {
    handler(payload);
  });
}

describe('leaving PiP brings the chrome back', () => {
  beforeEach(() => {
    mockPiPHandlers.clear();
    mockUnsubscribed.length = 0;
    jest.clearAllMocks();
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

  it('subscribes to the PiP mode event while the player is expanded', async () => {
    const result = await render(<VideoPlayer />);

    expect(mockPiPHandlers.has('onPipModeChanged')).toBe(true);
    result.unmount();
  });

  /**
   * THE regression test.
   *
   * Every assertion in it fails if the PiP reconciliation is mounted
   * anywhere inside the expanded chrome:
   *
   *   1. the subscriber must SURVIVE entering PiP — it is the only thing
   *      that can report the window closing;
   *   2. the native event must then clear the flag;
   *   3. and the chrome must be back in the tree.
   */
  it('keeps listening while PiP is up, and restores the chrome when it ends', async () => {
    const result = await render(<VideoPlayer />);
    expect(screen.getByTestId('transport-bar')).toBeTruthy();

    // ── The user taps the PiP button. The app suppresses the chrome
    //    optimistically; the native window is up.
    await act(async () => {
      usePresentationStore.getState().setPipActive(true);
    });

    expect(usePresentationStore.getState().pipActive).toBe(true);
    // The chrome is gone — that is what PiP means.
    expect(screen.queryByTestId('transport-bar')).toBeNull();

    // ── AND the reconciliation is still listening. This is the assertion
    //    that fails when the bridge lives inside the expanded chrome: the
    //    unmount takes the subscription with it.
    expect(mockPiPHandlers.has('onPipModeChanged')).toBe(true);
    expect(mockUnsubscribed).not.toContain('onPipModeChanged');

    // ── The user leaves PiP. The native side reports it.
    await emitNative('onPipModeChanged', {isInPip: false});

    expect(usePresentationStore.getState().pipActive).toBe(false);
    expect(screen.getByTestId('transport-bar')).toBeTruthy();
    result.unmount();
  });

  it('a system-initiated PiP is reconciled too', async () => {
    const result = await render(<VideoPlayer />);

    // Android started PiP on its own (home gesture / auto-enter): the app
    // never pressed its own button, so nothing set the flag optimistically.
    await emitNative('onPipModeChanged', {isInPip: true});
    expect(usePresentationStore.getState().pipActive).toBe(true);

    await emitNative('onPipModeChanged', {isInPip: false});
    expect(usePresentationStore.getState().pipActive).toBe(false);
    expect(screen.getByTestId('transport-bar')).toBeTruthy();
    result.unmount();
  });

  it('the PiP window expand button restores the chrome', async () => {
    const result = await render(<VideoPlayer />);

    await act(async () => {
      usePresentationStore.getState().setPipActive(true);
    });

    await emitNative('onPipExpand', {});

    expect(mockCommands.exitPip).toHaveBeenCalledTimes(1);
    expect(usePresentationStore.getState().pipActive).toBe(false);
    expect(screen.getByTestId('transport-bar')).toBeTruthy();
    result.unmount();
  });
});
