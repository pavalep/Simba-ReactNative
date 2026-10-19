/// <reference types="node" />
/**
 * V19 W1 Phase 1.3 — `VideoErrorOverlay` tests.
 *
 * **W5 reaudit update.** This suite previously asserted the
 * placeholder behavior that shipped in W1:
 *   - every error rendered as "Connection problem" (the hardcoded
 *     `kind = 'network'` stub),
 *   - Retry launched `openPlayer({uri: ''})` (an empty URI),
 *   - Close was a no-op.
 *
 * Those assertions described a fake control surface, so they were
 * replaced with assertions for the real one: the copy comes from
 * `classifyError()`, Retry is hidden unless a real retry target
 * exists, and Close releases the session.
 *
 * ## The retry target
 *
 * Retry used to be gated on `VideoController.getState().currentItem`,
 * which is ALWAYS null: `currentItem` is only set by
 * `controller.loadFile()`, and `loadFile` has zero call sites — the
 * LIB loads the file. So the gate was a permanent `false`, the Retry
 * button never rendered, and a load failure was a dead end.
 *
 * The real target is the app's own now-playing session, which is
 * written by the launch seam that started this playback. Retrying
 * re-launches that session through the same seam, so there is one
 * launch authority and no second path.
 */

import * as React from 'react';
import {fireEvent, screen} from '@testing-library/react-native';
import {renderChrome} from '../../../helpers/renderChrome';
import {VideoErrorOverlay} from '../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay';

// Mock the transport facade so the overlay sees a controlled
// videoState / error and can assert the commands it calls.
const mockVideoState = {current: 'idle' as string, error: null as unknown};
const mockCommands = {
  close: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn(),
};
const mockOpenPlayer = jest.fn((_opts: unknown) => Promise.resolve(true));

jest.mock('../../../../src/infrastructure/player', () => ({
  usePlaybackState: () => ({
    videoState: mockVideoState.current,
    error: mockVideoState.error,
  }),
  useTransport: () => ({state: {}, commands: mockCommands}),
  useResumeAwareLaunch: () => ({openPlayer: mockOpenPlayer}),
  // The REAL `usePresentation`, so the dock shape is driven by the real
  // store rather than by a mocked boolean.
  ...jest.requireActual('../../../../src/infrastructure/player/usePresentation'),
  classifyError: jest.requireActual(
    '../../../../src/infrastructure/player/video/errorClassifier',
  ).classifyError,
}));

import {useNowPlayingStore} from '../../../../src/state/nowPlayingStore';
import {usePresentationStore} from '../../../../src/state/usePresentationStore';

/** A video session — the retry target. */
function setVideoSession(overrides: Record<string, unknown> = {}) {
  useNowPlayingStore.setState({
    current: {
      uri: 'file:///movies/film.mkv',
      title: 'Film',
      startPositionMs: 0,
      streamType: 'video',
      sessionId: 7,
      ...overrides,
    },
  } as never);
}

describe('VideoErrorOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoState.current = 'idle';
    mockVideoState.error = null;
    useNowPlayingStore.setState({current: null} as never);
    usePresentationStore.setState({
      pipActive: false,
      videoPresentation: 'expanded',
      videoMiniRect: null,
      videoLaneOrigin: null,
    });
  });

  it('renders nothing when videoState is not "error"', async () => {
    mockVideoState.current = 'playing';
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.queryByText("Couldn't reach the server")).toBeNull();
    expect(screen.queryByLabelText('Close player')).toBeNull();
  });

  it('renders nothing on the idle screen', async () => {
    mockVideoState.current = 'idle';
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.queryByLabelText('Close player')).toBeNull();
  });

  it('shows the classifier copy for a real network failure', async () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 503 Service Unavailable');
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.getByText("Couldn't reach the server")).toBeTruthy();
  });

  it('does NOT hardcode "Connection problem" for a codec failure', async () => {
    // W5 reaudit: every error used to render as a connection
    // problem. A codec failure must now show codec copy.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('no decoder for codec hevc failed');
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.getByText("Can't play this video")).toBeTruthy();
    expect(screen.queryByText('Connection problem')).toBeNull();
  });

  it('shows a distinct title for an expired session', async () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 401 Unauthorized');
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.getByText('Sign in again')).toBeTruthy();
  });

  it('hides Retry when there is no session to retry', async () => {
    // No-inert-control rule: a Retry button that cannot retry must
    // not render at all. And there IS a case where it cannot: no
    // session means nothing was launched, so nothing can be re-launched.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.queryByLabelText('Retry loading')).toBeNull();
    expect(screen.getByLabelText('Close player')).toBeTruthy();
  });

  it('hides Retry for an AUDIO session — the audio chrome owns that', async () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    setVideoSession({streamType: 'audio', uri: 'file:///podcasts/ep.mp3'});
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.queryByLabelText('Retry loading')).toBeNull();
  });

  it('renders Retry when a video session gives a real retry target', async () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    setVideoSession();
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    expect(screen.getByLabelText('Retry loading')).toBeTruthy();
  });

  it('Retry re-launches the session through the app’s launch seam', async () => {
    // The old Retry called `controller.retry()`, whose target was
    // always null, and before that it called
    // `openPlayer({uri: '', title: '', type: 'video'})` — an EMPTY URI
    // that could not re-load anything.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    setVideoSession({startPositionMs: 1500});
    await renderChrome(<VideoErrorOverlay />, {theme: true});

    // `fireEvent.press` rather than calling `props.onPress()`:
    // Pressable wraps the handler, so invoking the raw prop bypasses
    // the pressability plumbing and never runs the callback.
    fireEvent.press(screen.getByLabelText('Retry loading'));

    expect(mockOpenPlayer).toHaveBeenCalledTimes(1);
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file:///movies/film.mkv',
        title: 'Film',
        type: 'video',
        // The position the session BEGAN at, passed explicitly so the
        // resume policy does not ask again about a position the user
        // already answered.
        startPositionMs: 1500,
      }),
    );
  });

  it('Retry never launches an empty URI', async () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    setVideoSession();
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    fireEvent.press(screen.getByLabelText('Retry loading'));

    const call = mockOpenPlayer.mock.calls[0][0] as {uri?: string};
    expect(call.uri).toBeTruthy();
    expect(call.uri).not.toBe('');
  });

  it('Close releases the session via commands.close()', async () => {
    // W5 reaudit: Close used to be an explicit no-op placeholder.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    await renderChrome(<VideoErrorOverlay />, {theme: true});
    fireEvent.press(screen.getByLabelText('Close player'));
    expect(mockCommands.close).toHaveBeenCalled();
  });

  describe('the dock shape', () => {
    beforeEach(() => {
      usePresentationStore.setState({videoPresentation: 'mini'});
    });

    it('shows the error title in the dock — a failure is never a black square', async () => {
      // A cold-start video begins minimised, so a cold-start LOAD
      // FAILURE happens in the dock. When the overlay lived only in the
      // expanded chrome, that failure was invisible: a black square in
      // the dock with no error and nothing to do about it.
      mockVideoState.current = 'error';
      mockVideoState.error = new Error('HTTP 503 Service Unavailable');
      setVideoSession();
      await renderChrome(<VideoErrorOverlay />, {theme: true});

      expect(screen.getByText("Couldn't reach the server")).toBeTruthy();
    });

    it('drops the action buttons — the dock slot is 44×44', async () => {
      // A button smaller than 44 pt is below the touch-target floor,
      // and the card does not fit. The actions are one tap away:
      // tapping the dock expands the player, where the full card is.
      mockVideoState.current = 'error';
      mockVideoState.error = new Error('HTTP 500');
      setVideoSession();
      await renderChrome(<VideoErrorOverlay />, {theme: true});

      expect(screen.queryByLabelText('Retry loading')).toBeNull();
      expect(screen.queryByLabelText('Close player')).toBeNull();
    });

    it('does not swallow the tap that expands the player', async () => {
      // The dock shape is `pointerEvents="none"`, so the tap that
      // expands the player still lands on the mini bar.
      mockVideoState.current = 'error';
      mockVideoState.error = new Error('HTTP 500');
      setVideoSession();
      await renderChrome(<VideoErrorOverlay />, {theme: true});

      const scrim = screen.getByLabelText("Couldn't reach the server");
      expect(scrim.props.pointerEvents).toBe('none');
    });
  });
});
