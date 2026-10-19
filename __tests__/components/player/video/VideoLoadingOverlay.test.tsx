/**
 * V19 W1 — `VideoLoadingOverlay` unit tests.
 *
 * Mirrors TRACKER Phase 1.2 verifications:
 *   - Renders nothing when videoState === 'idle'
 *   - Spinner + 'Preparing video' when videoState === 'preparing'
 *   - Spinner + 'Buffering' when isBuffering === true (and videoState !== 'preparing')
 *   - Positions spinner at the geometric center of the parent
 *   - Does NOT call any playback command (no openPlayer / commands.*)
 *
 * ## The delay
 *
 * The spinner is not shown the instant the player stalls. Two
 * documented rules say why, and both are invisible to a screenshot:
 *
 *   - Video.js's buffering indicator: 500 ms onset delay, so a stall
 *     shorter than that never puts a spinner on screen. A sub-second
 *     flicker reads as a glitch, not as "the network paused".
 *   - UX Tigers: once an indicator is up it stays up for at least
 *     ~0.5 s, so the user perceives it rather than seeing a flash.
 *
 * The clock is fake, so the suite does not depend on wall time and
 * does not spend half a second per case.
 *
 * ## The dock shape
 *
 * The dock's video slot is a fixed 44×44 square. A large spinner and
 * a caption do not fit in it, so the dock gets a small spinner and no
 * caption. The accessibility label still carries the state, so a
 * screen-reader user is not left with less than a sighted one.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.2.
 */

import * as React from 'react';
import {act, render, screen} from '@testing-library/react-native';
import {VideoLoadingOverlay} from '../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay';

// Mock the facade hook so each test can drive the derived state.
jest.mock('../../../../src/infrastructure/player', () => ({
  // Spread the individual facade SUBMODULES (not the barrel — Jest is
  // mid-mock on that module, so its re-export getters read a
  // half-initialised namespace). Only `usePlaybackState` is
  // controlled here; every other hook the component reaches for
  // still resolves.
  ...jest.requireActual('../../../../src/infrastructure/player/usePlaybackState'),
  ...jest.requireActual('../../../../src/infrastructure/player/useTransport'),
  // The REAL `usePresentation`, so the dock shape is driven by the
  // real store rather than by a mocked boolean.
  ...jest.requireActual('../../../../src/infrastructure/player/usePresentation'),
  usePlaybackState: jest.fn(),
}));

import {usePlaybackState} from '../../../../src/infrastructure/player';
import {usePresentationStore} from '../../../../src/state/usePresentationStore';
const mockUsePlaybackState = usePlaybackState as jest.MockedFunction<
  typeof usePlaybackState
>;

jest.mock('../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {surfaceDark: '#000000'},
      text: {primary: '#FFFFFF', secondary: '#AAAAAA', onMediaSoft: '#EEEEEE', onMediaMuted: '#BBBBBB'},
      accent: {gold: '#C9A84C'},
    },
    spacing: {md: 16, sm: 8, lg: 24, xs: 4},
    typography: {
      body1: {fontSize: 16, lineHeight: 22, fontWeight: '400'},
      caption: {fontSize: 12, lineHeight: 16, fontWeight: '400'},
    },
  }),
}));

function mockState(overrides: Partial<ReturnType<typeof usePlaybackState>>) {
  mockUsePlaybackState.mockReturnValue({
    videoState: 'idle',
    isPlaying: false,
    hasSession: false,
    isBuffering: false,
    positionMs: 0,
    durationMs: 0,
    isAtEnd: false,
    // Added in the W5 reaudit: the raw lib error is now part of the
    // derived state so `VideoErrorOverlay` can classify it.
    error: null,
    ...overrides,
  });
}

/** Let the onset delay elapse so the indicator is on screen. */
async function elapseOnset() {
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
}

describe('VideoLoadingOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUsePlaybackState.mockReset();
    usePresentationStore.setState({
      pipActive: false,
      videoPresentation: 'expanded',
      videoMiniRect: null,
      videoLaneOrigin: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when videoState === "idle"', async () => {
    mockState({videoState: 'idle', isBuffering: false});
    await render(<VideoLoadingOverlay />);
    // No "Loading" progressbar, no "Preparing video" / "Buffering" label.
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Preparing video')).toBeNull();
    expect(screen.queryByText('Buffering')).toBeNull();
  });

  it('does NOT flash the spinner for a stall shorter than the onset delay', async () => {
    // The Video.js rule. A 200 ms hiccup is a hiccup, not a stall, and a
    // spinner that appears and vanishes inside one frame is read as a
    // glitch. This is the behaviour the old overlay could not have:
    // it showed the spinner the instant the state changed.
    mockState({videoState: 'playing', isPlaying: true, isBuffering: true, hasSession: true});
    await render(<VideoLoadingOverlay />);

    expect(screen.queryByRole('progressbar')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(499);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders the spinner + "Preparing video" when videoState === "preparing"', async () => {
    mockState({videoState: 'preparing', hasSession: true, isBuffering: false});
    await render(<VideoLoadingOverlay />);
    await elapseOnset();
    expect(screen.getByText('Preparing video')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders the spinner + "Buffering" when isBuffering === true during playback', async () => {
    mockState({videoState: 'playing', isPlaying: true, isBuffering: true, hasSession: true});
    await render(<VideoLoadingOverlay />);
    await elapseOnset();
    expect(screen.getByText('Buffering')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('positions the overlay at the geometric center of the parent', async () => {
    mockState({videoState: 'preparing'});
    await render(<VideoLoadingOverlay />);
    await elapseOnset();
    // The View with role='progressbar' IS the centering container.
    // `styles.container` is a single registered StyleSheet entry, so
    // `props.style` arrives already flattened — not as an array.
    const overlay = screen.getByRole('progressbar');
    expect(overlay.props.style).toEqual(
      expect.objectContaining({
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }),
    );
  });

  it('is a real accessibility element (not an inert labelled View)', async () => {
    // `accessibilityRole` / `accessibilityLabel` are inert on a View
    // without `accessible` — VoiceOver skips the node and the whole
    // overlay announces nothing while the video is stuck buffering.
    mockState({videoState: 'preparing'});
    await render(<VideoLoadingOverlay />);
    await elapseOnset();
    const overlay = screen.getByRole('progressbar');
    expect(overlay.props.accessible).toBe(true);
    expect(overlay.props.accessibilityLabel).toBe('Loading');
  });

  describe('the dock shape', () => {
    beforeEach(() => {
      usePresentationStore.setState({videoPresentation: 'mini'});
    });

    it('drops the caption — the dock slot is 44×44 and cannot hold one', async () => {
      // A caption that overflows its box spills over the mini bar's
      // artwork. The state is still announced through the container's
      // accessibility label, so nothing is lost to a screen reader.
      mockState({videoState: 'playing', isPlaying: true, isBuffering: true, hasSession: true});
      await render(<VideoLoadingOverlay />);
      await elapseOnset();

      expect(screen.getByRole('progressbar')).toBeTruthy();
      expect(screen.queryByText('Buffering')).toBeNull();
      expect(screen.queryByText('Preparing video')).toBeNull();
    });

    it('keeps the accessibility label, so the state is still announced', async () => {
      mockState({videoState: 'playing', isPlaying: true, isBuffering: true, hasSession: true});
      await render(<VideoLoadingOverlay />);
      await elapseOnset();

      expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Loading');
    });
  });

  it('does NOT call any playback command', async () => {
    // The overlay is purely informational. The component imports only
    // `usePlaybackState` and `usePresentation` from the facade — no
    // `useResumeAwareLaunch`, no `usePlayer`, no command functions.
    // Static import check is the cheapest way to assert the contract.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay.tsx',
      ),
      'utf8',
    );
    expect(src).not.toMatch(/openPlayer|commands\.|playbackFacade/);
  });
});
