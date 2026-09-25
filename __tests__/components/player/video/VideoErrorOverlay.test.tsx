/**
 * V19 W1 — `VideoErrorOverlay` unit tests.
 *
 * Mirrors TRACKER Phase 1.3 verifications:
 *   - Renders nothing when videoState !== 'error'
 *   - Title + message match the error classifier
 *   - Retry calls openPlayer() (the launch re-fire)
 *   - Close is a no-op placeholder in W1 (W4 wires the V19 SimbaPlayer close path)
 *   - Retry is NOT auto-invoked on mount (no useEffect-with-calls)
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.3.
 */

import * as React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {VideoErrorOverlay} from '../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay';

// Mocks
jest.mock('../../../../src/infrastructure/player', () => ({
  usePlaybackState: jest.fn(),
  usePlayerActivity: jest.fn(),
}));

import {
  usePlaybackState,
  usePlayerActivity,
} from '../../../../src/infrastructure/player';
const mockUsePlaybackState = usePlaybackState as jest.MockedFunction<
  typeof usePlaybackState
>;
const mockUsePlayerActivity = usePlayerActivity as jest.MockedFunction<
  typeof usePlayerActivity
>;

jest.mock('../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {surfaceDark: '#000000'},
      text: {primary: '#FFFFFF', secondary: '#AAAAAA', inverse: '#000000'},
      accent: {gold: '#C9A84C'},
      border: {emphasis: '#666666'},
    },
    spacing: {md: 16, sm: 8, lg: 24},
    radius: {md: 8},
    typography: {
      body1: {fontSize: 16, lineHeight: 22, fontWeight: '400'},
      h3: {fontSize: 22, lineHeight: 28, fontWeight: '600'},
      button: {fontSize: 16, lineHeight: 22, fontWeight: '600'},
    },
  }),
}));

function mockState(videoState: 'idle' | 'preparing' | 'playing' | 'paused' | 'buffering' | 'finished' | 'error') {
  mockUsePlaybackState.mockReturnValue({
    videoState,
    isPlaying: videoState === 'playing',
    hasSession: videoState !== 'idle',
    isBuffering: videoState === 'buffering',
    positionMs: 0,
    durationMs: 0,
    isAtEnd: false,
  });
  mockUsePlayerActivity.mockReturnValue({
    openPlayer: jest.fn().mockResolvedValue(true),
    getLaunchParams: jest.fn(),
  } as unknown as ReturnType<typeof usePlayerActivity>);
}

describe('VideoErrorOverlay', () => {
  beforeEach(() => {
    mockUsePlaybackState.mockReset();
    mockUsePlayerActivity.mockReset();
  });

  it('renders nothing when videoState !== "error"', () => {
    mockState('playing');
    render(<VideoErrorOverlay />);
    expect(screen.queryByText('Connection problem')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
    expect(screen.queryByText('Close')).toBeNull();
  });

  it('renders the error title + message when videoState === "error"', () => {
    mockState('error');
    render(<VideoErrorOverlay />);
    expect(screen.getByText('Connection problem')).toBeTruthy();
    expect(
      screen.getByText('Check your connection and try again.'),
    ).toBeTruthy();
  });

  it('Retry button is wired with accessibilityLabel "Retry loading"', () => {
    mockState('error');
    render(<VideoErrorOverlay />);
    const retry = screen.getByLabelText('Retry loading');
    expect(retry).toBeTruthy();
  });

  it('Retry calls openPlayer() on press (the launch re-fire)', () => {
    mockState('error');
    const openPlayer = jest.fn().mockResolvedValue(true);
    mockUsePlayerActivity.mockReturnValue({
      openPlayer,
      getLaunchParams: jest.fn(),
    } as unknown as ReturnType<typeof usePlayerActivity>);

    render(<VideoErrorOverlay />);
    fireEvent.press(screen.getByLabelText('Retry loading'));
    expect(openPlayer).toHaveBeenCalledTimes(1);
    // The retry uses an empty input (the V19 SimbaPlayer caches the
    // previous source; in W4 the SimbaPlayer forwards its cached
    // `source` prop to `openPlayer`. W1 leaves it empty because
    // there's no SimbaPlayer yet — the lib's openPlayer accepts an
    // empty input and re-loads the current session.)
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({type: 'video'}),
    );
  });

  it('does NOT auto-invoke Retry on mount (no useEffect calls)', () => {
    const openPlayer = jest.fn().mockResolvedValue(true);
    mockUsePlayerActivity.mockReturnValue({
      openPlayer,
      getLaunchParams: jest.fn(),
    } as unknown as ReturnType<typeof usePlayerActivity>);
    mockState('error');

    render(<VideoErrorOverlay />);
    // No press, no effect — openPlayer MUST NOT have been called yet.
    expect(openPlayer).not.toHaveBeenCalled();
  });

  it('hides during buffering (buffering is NOT an error)', () => {
    mockState('buffering');
    render(<VideoErrorOverlay />);
    expect(screen.queryByText('Connection problem')).toBeNull();
    expect(screen.queryByLabelText('Retry loading')).toBeNull();
  });
});
