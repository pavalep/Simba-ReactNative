/// <reference types="node" />
/**
 * V19 W3.6 Phase 3.6.1 — `CaptionTrackSelector` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.1.
 *
 * Covers:
 *   - renders nothing when visible=false
 *   - "Off" entry always present
 *   - one menu row per caption track from useTransport().captionTracks
 *   - active track is gold-highlighted (selected state)
 *   - tapping a track calls onSelect(track.id)
 *   - tapping "Off" calls onSelect(null)
 *   - classifyCaptionKind classifies common markers
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {
  CaptionTrackSelector,
  classifyCaptionKind,
  formatCaptionLabel,
} from '../../../../../src/components/player/video/Captions/CaptionTrackSelector';
import type {CaptionTrack} from '../../../../../src/infrastructure/player';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        elevated: '#141416',
        scrimDim: 'rgba(0,0,0,0.45)',
      },
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
  {id: 100, label: 'English [CC]', lang: 'en', active: false},
  {id: 101, label: 'English [SDH]', lang: 'en', active: false},
  {id: 102, label: 'Español (Subtitles)', lang: 'es', active: false},
];

const mockTransport: {
  state: {captionTracks: CaptionTrack[]; activeCaptionTrackId: number | null};
} = {
  state: {captionTracks: TRACKS, activeCaptionTrackId: 100},
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

describe('CaptionTrackSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = {captionTracks: TRACKS, activeCaptionTrackId: 100};
  });

  it('renders nothing when visible=false', async () => {
    const {toJSON} = await render(
      <CaptionTrackSelector
        visible={false}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders "Off" + one menu row per track', async () => {
    const {getByLabelText} = await render(
      <CaptionTrackSelector
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions off')).toBeTruthy();
    expect(getByLabelText('Captions: English [CC]')).toBeTruthy();
    expect(getByLabelText('Captions: English [SDH]')).toBeTruthy();
    expect(getByLabelText('Captions: Español (Subtitles)')).toBeTruthy();
  });

  it('marks the active track as selected', async () => {
    const {getByLabelText} = await render(
      <CaptionTrackSelector
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions: English [CC]').props.accessibilityState)
      .toEqual({selected: true});
    expect(getByLabelText('Captions: English [SDH]').props.accessibilityState)
      .toEqual({selected: false});
  });

  it('marks "Off" as selected when activeCaptionTrackId is null', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByLabelText} = await render(
      <CaptionTrackSelector
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions off').props.accessibilityState)
      .toEqual({selected: true});
  });

  it('tapping a track calls onSelect(track.id)', async () => {
    const onSelect = jest.fn();
    const {getByLabelText} = await render(
      <CaptionTrackSelector visible onSelect={onSelect} onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Captions: Español (Subtitles)'));
    expect(onSelect).toHaveBeenCalledWith(102);
  });

  it('tapping "Off" calls onSelect(null)', async () => {
    const onSelect = jest.fn();
    const {getByLabelText} = await render(
      <CaptionTrackSelector visible onSelect={onSelect} onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Captions off'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('classifyCaptionKind (pure helper)', () => {
  it('classifies [CC] as caption', () => {
    expect(classifyCaptionKind('English [CC]')).toBe('caption');
  });
  it('classifies [SDH] as sdh', () => {
    expect(classifyCaptionKind('English [SDH]')).toBe('sdh');
  });
  it('classifies (Subtitles) as subtitle', () => {
    expect(classifyCaptionKind('Español (Subtitles)')).toBe('subtitle');
  });
  it('defaults unlabeled to subtitle', () => {
    expect(classifyCaptionKind('English')).toBe('subtitle');
  });
  it('[SDH] takes precedence over [CC] when both present', () => {
    expect(classifyCaptionKind('English [CC] [SDH]')).toBe('sdh');
  });
});

describe('formatCaptionLabel (pure helper)', () => {
  it('returns the track label verbatim', () => {
    const track: CaptionTrack = {
      id: 1,
      label: 'English [CC]',
      lang: 'en',
      active: false,
    };
    expect(formatCaptionLabel(track)).toBe('English [CC]');
  });
});
