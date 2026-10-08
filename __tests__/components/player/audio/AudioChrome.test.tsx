/// <reference types="node" />
/**
 * `AudioChrome` — the mini bar / full player switch, and the close verb.
 *
 * The close path is the important half. It is the one control that can
 * look like it worked while the native side kept playing: dismissing the
 * UI without stopping the engine leaves sound coming from a "closed"
 * player, and a plain `commands.stop()` also leaves the MediaSession
 * registered and the notification posted.
 *
 * Every "must not" here is mutation-checked against the real source.
 *
 * ## Why the mocks point at defining modules
 *
 * `useTransport` / `formatMsAsClock` are mocked from
 * `infrastructure/player/useTransport`, and `getMpvPlayerModule` from the
 * LIB — not from the app's `infrastructure/player` barrel. That barrel
 * re-exports `VideoPlayer`, which imports the barrel back, so a component
 * importing it sits on a cycle: `infrastructure/player/index.ts:218` ->
 * `VideoPlayer` -> `infrastructure/player/index.ts:69`. Metro's
 * ESM->CJS interop hands a cycle a partially-initialised module, which
 * surfaced on device as a redbox reading
 * "Property 'AudioChrome' doesn't exist".
 */

import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';

const mockToastShow = jest.fn();

jest.mock('../../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: mockToastShow, hide: jest.fn()}),
}));

const mockIsPlayerActivity = jest.fn(() => false);
const mockStopAudioPlayback = jest.fn();

jest.mock('@simba-dev/react-native-media-player', () => ({
  useIsPlayerActivity: () => mockIsPlayerActivity(),
  getMpvPlayerModule: () => ({
    stopAudioPlayback: mockStopAudioPlayback,
  }),
}));

const mockCommandsStop = jest.fn();

const mockTransportState = {
  positionMs: 60_000,
  durationMs: 240_000,
  isPlaying: true,
  shuffle: false,
  isBuffering: false,
  isSeeking: false,
  isEnded: false,
  bufferedRanges: [],
  normalizedWindow: null,
  seekable: true,
  canEnterPip: false,
  isOrientationLocked: false,
  repeatMode: 'off' as const,
  captionTracks: [],
  activeCaptionTrackId: null,
  canGoPrev: false,
  canGoNext: false,
  currentUri: null,
  nextTrack: null,
  speed: 1,
  volume: 100,
  isMuted: false,
  title: 'Track Title',
  artist: 'Track Artist',
};

const mockCommands = {
  seek: jest.fn(),
  seekBy: jest.fn(),
  togglePlayPause: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  setSpeed: jest.fn(),
  setVolume: jest.fn(),
  setScreenBrightness: jest.fn(),
  getScreenBrightness: jest.fn(() => 0.5),
  setProperty: jest.fn(),
  setLoopMode: jest.fn(),
  setTrack: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  setAudioFilter: jest.fn(),
  setVideoFilter: jest.fn(),
  setShuffle: jest.fn(),
  setOrientation: jest.fn(),
  exitPipAndFinish: jest.fn(),
  stop: mockCommandsStop,
  clear: jest.fn(),
};

jest.mock('../../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({state: mockTransportState, commands: mockCommands}),
  formatMsAsClock: (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
}));

jest.mock('../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      accent: {gold: '#C9A84C'},
      background: {
        primary: '#0A0A0C',
        elevated: '#141416',
        onMediaSheet: '#121216',
        seekTrack: {empty: 'rgba(255,255,255,0.28)'},
        onMediaPill: 'rgba(0,0,0,0.42)',
      },
      text: {
        bright: '#FFFFFF',
        primary: '#EDEDED',
        onMediaSoft: 'rgba(255,255,255,0.80)',
        onMediaMuted: 'rgba(255,255,255,0.70)',
      },
      border: {subtle: 'rgba(255,255,255,0.16)'},
    },
  }),
}));

import {AudioChrome} from '../../../../src/components/player/audio/AudioChrome';
import {useNowPlayingStore} from '../../../../src/state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../../src/state/useAudioPresentationStore';

/**
 * RNTL 14 returns a Promise from ct, and it MUST be awaited. An
 * unawaited ct leaves a pending act queue behind, which silently
 * swallows the next render — the component tree comes back 
ull and
 * every getByTestId fails for reasons that look nothing like the
 * cause.
 */
async function seedSession() {
  await act(async () => {
    useNowPlayingStore
      .getState()
      .begin({uri: 'file:///a.mp3', title: 'Track Title'});
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockIsPlayerActivity.mockReturnValue(false);
  mockStopAudioPlayback.mockReset();
  await act(async () => {
    useNowPlayingStore.getState().reset();
    useAudioPresentationStore.setState({mode: 'expanded'});
  });
});

describe('AudioChrome — visibility', () => {
  it('renders nothing when no track is loaded', async () => {
    const {toJSON} = await render(<AudioChrome />);
    expect(toJSON()).toBeNull();
  });

  it('renders the full player when a session exists and mode is expanded', async () => {
    await seedSession();
    const {getByTestId} = await render(<AudioChrome />);
    expect(getByTestId('audio-minimize')).toBeTruthy();
  });

  it('renders the mini bar when mode is mini', async () => {
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    const {getByTestId, queryByTestId} = await render(<AudioChrome />);
    expect(getByTestId('audio-mini-bar')).toBeTruthy();
    expect(queryByTestId('audio-minimize')).toBeNull();
  });

  // The video player owns its own Activity window. While it is up this
  // tree is behind it, so audio chrome must not be mounted at all.
  it('renders nothing inside the player Activity', async () => {
    await seedSession();
    mockIsPlayerActivity.mockReturnValue(true);
    const {toJSON} = await render(<AudioChrome />);
    expect(toJSON()).toBeNull();
  });
});

describe('AudioChrome — close is a real teardown', () => {
  it('calls the native stopAudioPlayback primitive', async () => {
    await seedSession();
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    expect(mockStopAudioPlayback).toHaveBeenCalledTimes(1);
  });

  it('does NOT fall back to the lib stop command, which leaves the session posted', async () => {
    await seedSession();
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    // `commands.stop()` mutes the engine but leaves the MediaSession
    // registered and the notification in the shade — a "closed" player
    // that still owns the media button.
    expect(mockCommandsStop).not.toHaveBeenCalled();
  });

  it('clears the session only after the native stop succeeded', async () => {
    await seedSession();
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    expect(useNowPlayingStore.getState().current).toBeNull();
  });

  // The case that would otherwise ship silently: audio keeps playing
  // behind a dismissed player and the user has no way to tell.
  it('keeps the player up and reports the error when the native stop fails', async () => {
    await seedSession();
    mockStopAudioPlayback.mockImplementation(() => {
      throw new Error('service refused to stop');
    });
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    expect(getByTestId('audio-close')).toBeTruthy();
    expect(useNowPlayingStore.getState().current).not.toBeNull();
    expect(mockToastShow).toHaveBeenCalledWith(
      'service refused to stop',
      'error',
    );
  });

  it('the mini bar closes through the same native path', async () => {
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('mini-close'));
    });

    expect(mockStopAudioPlayback).toHaveBeenCalledTimes(1);
  });
});

describe('AudioChrome — minimize does not touch playback', () => {
  it('collapses to the mini bar without stopping anything', async () => {
    await seedSession();
    const {getByTestId} = await render(<AudioChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-minimize'));
    });

    expect(getByTestId('audio-mini-bar')).toBeTruthy();
    expect(mockStopAudioPlayback).not.toHaveBeenCalled();
    expect(mockCommandsStop).not.toHaveBeenCalled();
    expect(useNowPlayingStore.getState().current).not.toBeNull();
  });
});