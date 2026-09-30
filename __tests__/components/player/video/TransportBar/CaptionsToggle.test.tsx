/// <reference types="node" />
/**
 * V19 W3 Phase 3.2 — `CaptionsToggle` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.2.
 *
 * Covers:
 *   - returns null when no caption tracks exist
 *   - renders the "CC" label when no track is active
 *   - renders the active track's label when one is active
 *   - tap on the toggle opens the CaptionsSheet
 *   - tapping a track in the sheet calls commands.selectCaptionTrack(id)
 *   - tapping "Off" in the sheet calls commands.selectCaptionTrack(null)
 *   - the a11y label reflects the current state
 */

import * as React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {CaptionsToggle} from '../../../../../src/components/player/video/TransportBar/CaptionsToggle';
import type {CaptionTrack} from '../../../../../src/infrastructure/player';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C'},
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

const TRACKS: CaptionTrack[] = [
  {id: 100, label: 'English', lang: 'en', active: true},
  {id: 101, label: 'Español', lang: 'es', active: false},
];

const mockSelectCaptionTrack = jest.fn();
const mockTransport: {
  state: {captionTracks: CaptionTrack[]; activeCaptionTrackId: number | null};
  commands: {selectCaptionTrack: jest.Mock};
} = {
  state: {captionTracks: [], activeCaptionTrackId: null},
  commands: {selectCaptionTrack: mockSelectCaptionTrack},
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

describe('CaptionsToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = {
      captionTracks: TRACKS,
      activeCaptionTrackId: 100,
    };
  });

  it('returns null when no caption tracks exist', async () => {
    mockTransport.state = {captionTracks: [], activeCaptionTrackId: null};
    const {toJSON} = await render(<CaptionsToggle />);
    expect(toJSON()).toBeNull();
  });

  it('renders the active track label when a track is active', async () => {
    const {getByText} = await render(<CaptionsToggle />);
    expect(getByText('English')).toBeTruthy();
  });

  it('renders "CC" when no track is active', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByText} = await render(<CaptionsToggle />);
    expect(getByText('CC')).toBeTruthy();
  });

  it('the a11y label reflects the current state', async () => {
    mockTransport.state.activeCaptionTrackId = 100;
    const {getByLabelText} = await render(<CaptionsToggle />);
    expect(
      getByLabelText('Captions: English. Tap to change.'),
    ).toBeTruthy();
  });

  it('the a11y label says "off" when no track is active', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByLabelText} = await render(<CaptionsToggle />);
    expect(
      getByLabelText('Captions off. Tap to choose a caption track.'),
    ).toBeTruthy();
  });

  it('opens the sheet on tap', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    await act(async () => {
      fireEvent.press(
        getByLabelText('Captions: English. Tap to change.'),
      );
    });
    expect(getByLabelText('Captions: Español')).toBeTruthy();
    expect(getByLabelText('Captions off')).toBeTruthy();
  });

  it('selecting a track calls commands.selectCaptionTrack(id)', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    await act(async () => {
      fireEvent.press(
        getByLabelText('Captions: English. Tap to change.'),
      );
    });
    fireEvent.press(getByLabelText('Captions: Español'));
    expect(mockSelectCaptionTrack).toHaveBeenCalledWith(101);
  });

  it('selecting "Off" calls commands.selectCaptionTrack(null)', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    await act(async () => {
      fireEvent.press(
        getByLabelText('Captions: English. Tap to change.'),
      );
    });
    fireEvent.press(getByLabelText('Captions off'));
    expect(mockSelectCaptionTrack).toHaveBeenCalledWith(null);
  });

  it('tapping the scrim closes the sheet WITHOUT changing the track', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    await act(async () => {
      fireEvent.press(
        getByLabelText('Captions: English. Tap to change.'),
      );
    });
    fireEvent.press(getByLabelText('Close captions picker'));
    expect(mockSelectCaptionTrack).not.toHaveBeenCalled();
    // The sheet is torn down — the toggle is the only thing left, and
    // it carries the same a11y label it had before opening.
    await act(async () => {});
    expect(
      screen.queryByLabelText('Close captions picker'),
    ).toBeNull();
    expect(
      getByLabelText('Captions: English. Tap to change.'),
    ).toBeTruthy();
  });
});
