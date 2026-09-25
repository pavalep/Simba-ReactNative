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
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.2.
 */

import * as React from 'react';
import {render, screen} from '@testing-library/react-native';
import {VideoLoadingOverlay} from '../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay';

// Mock the facade hook so each test can drive the derived state.
jest.mock('../../../../src/infrastructure/player', () => ({
  usePlaybackState: jest.fn(),
}));

import {usePlaybackState} from '../../../../src/infrastructure/player';
const mockUsePlaybackState = usePlaybackState as jest.MockedFunction<
  typeof usePlaybackState
>;

jest.mock('../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {surfaceDark: '#000000'},
      text: {primary: '#FFFFFF', secondary: '#AAAAAA'},
      accent: {gold: '#C9A84C'},
    },
    spacing: {md: 16, sm: 8, lg: 24},
    typography: {
      body1: {fontSize: 16, lineHeight: 22, fontWeight: '400'},
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
    ...overrides,
  });
}

describe('VideoLoadingOverlay', () => {
  beforeEach(() => {
    mockUsePlaybackState.mockReset();
  });

  it('renders nothing when videoState === "idle"', () => {
    mockState({videoState: 'idle', isBuffering: false});
    render(<VideoLoadingOverlay />);
    // No "Loading" progressbar, no "Preparing video" / "Buffering" label.
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Preparing video')).toBeNull();
    expect(screen.queryByText('Buffering')).toBeNull();
  });

  it('renders the spinner + "Preparing video" when videoState === "preparing"', () => {
    mockState({videoState: 'preparing', hasSession: true, isBuffering: false});
    render(<VideoLoadingOverlay />);
    expect(screen.getByText('Preparing video')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders the spinner + "Buffering" when isBuffering === true during playback', () => {
    mockState({videoState: 'playing', isPlaying: true, isBuffering: true, hasSession: true});
    render(<VideoLoadingOverlay />);
    expect(screen.getByText('Buffering')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('positions the overlay at the geometric center of the parent', () => {
    mockState({videoState: 'preparing'});
    render(<VideoLoadingOverlay />);
    // The View with role='progressbar' IS the centering container.
    const overlay = screen.getByRole('progressbar');
    expect(overlay.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alignItems: 'center',
          justifyContent: 'center',
        }),
      ]),
    );
  });

  it('does NOT call any playback command', () => {
    // The overlay is purely informational. The component imports only
    // `usePlaybackState` from the facade — no `usePlayerActivity`,
    // no `usePlayer`, no command functions. Static import check is
    // the cheapest way to assert the contract.
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
