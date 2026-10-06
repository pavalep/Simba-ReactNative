/// <reference types="node" />
/**
 * V19 W8.7 — `CaptionsToggle` unit tests.
 *
 * ## What changed
 *
 * W8.7 deleted the captions PICKER (`CaptionsSheet`), along with the
 * repeat popup. The control now CYCLES: off → track 1 → track 2 → off,
 * advanced by a single tap — the behaviour Plex and VLC ship.
 *
 * So the assertions changed shape. Where this suite used to press once
 * and then pick a row out of a menu, it now presses once and asserts
 * the exact next track, plus asserts that no menu appears at all.
 *
 * `nextCaptionTrackId` is tested on its own because it is where the
 * interesting failures live: the wrap from the last track back to off,
 * and the case where nothing is active.
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {
  CaptionsToggle,
  nextCaptionTrackId,
} from '../../../../../src/components/player/video/TransportBar/CaptionsToggle';
import type {CaptionTrack} from '../../../../../src/infrastructure/player';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../../../../../src/theme', () => {
  const {darkTokens} = jest.requireActual(
    '../../../../../src/theme/tokens',
  );
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
      radius: {lg: 16},
      typography: darkTokens.typography,
    }),
  };
});

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

// ── Tests ────────────────────────────────────────────────────────────

describe('CaptionsToggle — the caption cycle (W8.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = {
      captionTracks: TRACKS,
      activeCaptionTrackId: 100,
    };
  });

  describe('nextCaptionTrackId', () => {
    it('turns captions ON with the first track when nothing is active', () => {
      expect(nextCaptionTrackId(TRACKS, null)).toBe(TRACKS[0].id);
    });

    it('advances to the next track', () => {
      expect(nextCaptionTrackId(TRACKS, TRACKS[0].id)).toBe(TRACKS[1].id);
    });

    it('wraps the LAST track back to captions off', () => {
      // `null` is the "captions off" state. If the last track wrapped
      // back to itself instead, captions could never be switched off
      // from a single-track file without opening a picker — which is
      // the control-that-cannot-act defect.
      expect(nextCaptionTrackId(TRACKS, TRACKS[1].id)).toBeNull();
    });

    it('visits every track exactly once before returning to off', () => {
      const visited: (number | null)[] = [];
      let active: number | null = null;
      for (let i = 0; i < TRACKS.length; i++) {
        active = nextCaptionTrackId(TRACKS, active);
        visited.push(active);
      }
      expect(visited).toEqual(TRACKS.map(t => t.id));
    });

    it('selects nothing when the file has no tracks', () => {
      expect(nextCaptionTrackId([], null)).toBeNull();
    });

    it('falls back to the first track when the active id is unknown', () => {
      // mpv can report a `selected` track the facade never listed (a
      // track that appeared after the list was built). An unknown id
      // must still resolve somewhere legal.
      expect(nextCaptionTrackId(TRACKS, 999)).toBe(TRACKS[0].id);
    });
  });

  it('returns null when no caption tracks exist', async () => {
    // SPEC I3: a control that cannot act must not render.
    mockTransport.state = {captionTracks: [], activeCaptionTrackId: null};
    const {toJSON} = await render(<CaptionsToggle />);
    expect(toJSON()).toBeNull();
  });

  it('one tap advances to the next track — no picker involved', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    fireEvent.press(getByLabelText('Captions: English'));
    expect(mockSelectCaptionTrack).toHaveBeenCalledTimes(1);
    expect(mockSelectCaptionTrack).toHaveBeenCalledWith(TRACKS[1].id);
  });

  it('tapping from the last track turns captions OFF', async () => {
    mockTransport.state.activeCaptionTrackId = TRACKS[1].id;
    const {getByLabelText} = await render(<CaptionsToggle />);
    fireEvent.press(getByLabelText('Captions: Español'));
    expect(mockSelectCaptionTrack).toHaveBeenCalledWith(null);
  });

  it('tapping while off turns the first track on', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByLabelText} = await render(<CaptionsToggle />);
    fireEvent.press(getByLabelText('Captions off'));
    expect(mockSelectCaptionTrack).toHaveBeenCalledWith(TRACKS[0].id);
  });

  it('renders NO popup — the picker pattern stays deleted', async () => {
    const {getByLabelText, queryByLabelText} =
      await render(<CaptionsToggle />);
    fireEvent.press(getByLabelText('Captions: English'));
    expect(queryByLabelText('Off')).toBeNull();
    expect(queryByLabelText('Close captions')).toBeNull();
    // One press must select exactly one track, not open a surface.
    expect(mockSelectCaptionTrack).toHaveBeenCalledTimes(1);
  });

  it('the a11y label names the rendering track, the hint says it cycles', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    const control = getByLabelText('Captions: English');
    expect(control.props.accessibilityHint).toBe(
      'Switches between captions off and each available subtitle track',
    );
    // The hint must not still advertise the deleted picker.
    expect(control.props.accessibilityHint).not.toMatch(/picker|menu/i);
  });

  it('the a11y label says "off" when no track is active', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByLabelText} = await render(<CaptionsToggle />);
    expect(getByLabelText('Captions off')).toBeTruthy();
  });

  // "A track is rendering" is the state that matters, and gold ink
  // alone does not convey it to a user who cannot distinguish the
  // colour (WCAG 1.4.1). The switch role + checked state is the
  // non-colour channel, so it is asserted directly.
  it('exposes the active state as a switch, not just as gold ink', async () => {
    const {getByLabelText} = await render(<CaptionsToggle />);
    const control = getByLabelText('Captions: English');
    expect(control.props.accessibilityRole).toBe('switch');
    expect(control.props.accessibilityState).toMatchObject({checked: true});
  });

  it('reports checked:false when captions are off', async () => {
    mockTransport.state.activeCaptionTrackId = null;
    const {getByLabelText} = await render(<CaptionsToggle />);
    const control = getByLabelText('Captions off');
    expect(control.props.accessibilityState).toMatchObject({checked: false});
  });
});