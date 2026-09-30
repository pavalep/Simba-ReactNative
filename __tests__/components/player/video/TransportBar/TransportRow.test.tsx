/// <reference types="node" />
/**
 * V19 W3 Phase 3.5 — `TransportRow` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.
 *
 * Covers:
 *   - all 5 buttons render when canGoPrev === canGoNext === true
 *   - Previous hidden when canGoPrev === false
 *   - Next hidden when canGoNext === false
 *   - tap on Rewind 10 calls commands.rewind10()
 *   - tap on Forward 10 calls commands.forward10()
 *   - tap on Previous calls commands.skipPrev()
 *   - tap on Next calls commands.next()
 *   - tap on Play-Pause (when not playing) calls commands.togglePlayPause()
 *   - tap on Replay (when ended) calls commands.seek(0)
 *   - a11y labels are state-aware (Play vs Pause vs Replay)
 *   - min hit areas >= 44pt
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {TransportRow} from '../../../../../src/components/player/video/TransportBar/TransportRow';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C', inverse: '#0A0A0C'},
      shadow: '#000000',
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {lg: 16},
    typography: {
      body2: {fontSize: 15, lineHeight: 22},
      caption: {fontSize: 13, lineHeight: 18},
    },
  }),
}));

const mockNext = jest.fn();
const mockSkipPrev = jest.fn();
const mockTogglePlayPause = jest.fn();
const mockSeek = jest.fn();
const mockRewind10 = jest.fn();
const mockForward10 = jest.fn();

const mockTransport: {
  state: {
    isPlaying: boolean;
    isEnded: boolean;
    isBuffering: boolean;
    canGoPrev: boolean;
    canGoNext: boolean;
  };
  commands: {
    rewind10: jest.Mock;
    forward10: jest.Mock;
    next: jest.Mock;
    skipPrev: jest.Mock;
    togglePlayPause: jest.Mock;
    seek: jest.Mock;
  };
} = {
  state: {
    isPlaying: false,
    isEnded: false,
    isBuffering: false,
    canGoPrev: true,
    canGoNext: true,
  },
  commands: {
    rewind10: mockRewind10,
    forward10: mockForward10,
    next: mockNext,
    skipPrev: mockSkipPrev,
    togglePlayPause: mockTogglePlayPause,
    seek: mockSeek,
  },
};

jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useTransport',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useHaptic',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/usePresentation',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useReduceMotion',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/usePlaybackState',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useKeyframes',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useSkipSilence',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useQueueSync',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/useChromeAutoHide',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/position',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/streamErrors',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/bridgeErrors',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/resumePolicy',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/validateLane',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/playbackFacade',
      ),
      ...jest.requireActual(
        '../../../../../src/infrastructure/player/video',
      ),
    };
  return {
    ...actual,
    useTransport: () => mockTransport,
  };
});

describe('TransportRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state.isPlaying = false;
    mockTransport.state.isEnded = false;
    mockTransport.state.isBuffering = false;
    mockTransport.state.canGoPrev = true;
    mockTransport.state.canGoNext = true;
  });

  it('renders all 5 controls when canGoPrev and canGoNext are true', async () => {
    const {getByLabelText} = await render(<TransportRow />);
    expect(getByLabelText('Rewind 10 seconds')).toBeTruthy();
    expect(getByLabelText('Previous track')).toBeTruthy();
    expect(getByLabelText('Play')).toBeTruthy();
    expect(getByLabelText('Next track')).toBeTruthy();
    expect(getByLabelText('Forward 10 seconds')).toBeTruthy();
  });

  it('hides Previous when canGoPrev is false (no dead spacer)', async () => {
    mockTransport.state.canGoPrev = false;
    const {queryByLabelText, getByLabelText} = await render(<TransportRow />);
    expect(queryByLabelText('Previous track')).toBeNull();
    expect(getByLabelText('Rewind 10 seconds')).toBeTruthy();
    expect(getByLabelText('Next track')).toBeTruthy();
  });

  it('hides Next when canGoNext is false (no dead spacer)', async () => {
    mockTransport.state.canGoNext = false;
    const {queryByLabelText, getByLabelText} = await render(<TransportRow />);
    expect(queryByLabelText('Next track')).toBeNull();
    expect(getByLabelText('Previous track')).toBeTruthy();
  });

  it('Rewind 10 calls commands.rewind10()', async () => {
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Rewind 10 seconds'));
    // `step` was removed from the facade in the W5 reaudit — it was a
    // fourth name for the same seek and `seekBy` already covered it.
    // The row now calls the dedicated `rewind10()` command.
    expect(mockRewind10).toHaveBeenCalledTimes(1);
  });

  it('Forward 10 calls commands.forward10()', async () => {
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Forward 10 seconds'));
    expect(mockForward10).toHaveBeenCalledTimes(1);
  });

  it('Previous calls commands.skipPrev()', async () => {
    // W3.6.11 — the button is the Apple Music / Spotify "smart
    // previous": the row decides restart-vs-skip against the
    // threshold store, so the chrome never issues a raw
    // `commands.previous()` of its own accord.
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Previous track'));
    expect(mockSkipPrev).toHaveBeenCalledTimes(1);
  });

  it('Next calls commands.next()', async () => {
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Next track'));
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('tap on Play (not playing) calls commands.togglePlayPause()', async () => {
    mockTransport.state.isPlaying = false;
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Play'));
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('tap on Pause (playing) calls commands.togglePlayPause()', async () => {
    mockTransport.state.isPlaying = true;
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Pause'));
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('tap on Replay (ended) calls commands.seek(0)', async () => {
    mockTransport.state.isEnded = true;
    const {getByLabelText} = await render(<TransportRow />);
    fireEvent.press(getByLabelText('Replay from beginning'));
    expect(mockSeek).toHaveBeenCalledWith(0);
    expect(mockTogglePlayPause).not.toHaveBeenCalled();
  });

  it('a11y label reflects the playing state', async () => {
    mockTransport.state.isPlaying = true;
    const {getByLabelText} = await render(<TransportRow />);
    expect(getByLabelText('Pause')).toBeTruthy();
    expect(() => getByLabelText('Play')).toThrow();
  });

  it('hit areas meet 44pt minimum', async () => {
    const {getByLabelText} = await render(<TransportRow />);
    const playBtn = getByLabelText('Play');
    const style = Array.isArray(playBtn.props.style)
      ? playBtn.props.style.flat(Infinity)
      : [playBtn.props.style];
    const minSize = style.find(
      s => typeof (s as {minHeight?: number}).minHeight === 'number',
    );
    expect((minSize as {minHeight: number}).minHeight).toBeGreaterThanOrEqual(
      44,
    );
  });
});
