/// <reference types="node" />
/**
 * `PlayerChrome` — the audio lane's host, and the close verb.
 *
 * The close path is the important half. It is the one control that can
 * look like it worked while the native side kept playing: dismissing the
 * UI without stopping the engine leaves sound coming from a "closed"
 * player, and a plain `commands.stop()` also leaves the MediaSession
 * registered and the notification posted.
 *
 * Every "must not" here is mutation-checked against the real source.
 *
 * ## V22 W22 (2026-10-21) — the shared `MiniPlayer` is gone
 *
 * There used to be a second player component that took turns with this
 * one: the expanded `AudioPlayer` mounted, then the `MiniPlayer` dock
 * mounted, then the expanded player again. The audio lane is now ONE tree
 * that renders both, and `PlayerChrome` hosts it. A video session renders
 * nothing here at all — the video lane is hosted by `VideoPlayer`.
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
 * "Property 'PlayerChrome' doesn't exist".
 */

import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';
import {BackHandler} from 'react-native';

const mockToastShow = jest.fn();

jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: mockToastShow, hide: jest.fn()}),
}));

const mockStopPlayback = jest.fn();

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    getMpvPlayerModule: () => ({
      stopPlayback: mockStopPlayback,
    }),
  };
});

const mockCommandsStop = jest.fn();
const mockSetVolume = jest.fn();
const mockSetMuted = jest.fn();
const mockNavigate = jest.fn();

const mockTransportState = {
  positionMs: 60_000,
  durationMs: 240_000,
  isPlaying: true,
  shuffle: false,
  isBuffering: false,
  isSeeking: false,
  isEnded: false,
  bufferedRanges: [],
  bufferedSegments: [],
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
  // The audio player's volume + mute verbs. Present here because the
  // controls were added to the audio player and these are the only thing
  // they can legitimately do — a mute button wired to nothing is exactly
  // the "jugaad feature" this audit is removing.
  setVolume: mockSetVolume,
  setMuted: mockSetMuted,
};

jest.mock('../../../src/navigation/navigationHelper', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

jest.mock('@react-native-community/slider', () => {
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock('../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({state: mockTransportState, commands: mockCommands}),
  formatMsAsClock: (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
}));

jest.mock('../../../src/theme', () => ({
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

import {PlayerChrome} from '../../../src/components/player/PlayerChrome';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../src/state/useAudioPresentationStore';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

/**
 * RNTL 14 returns a Promise from `act`, and it MUST be awaited. An
 * unawaited `act` leaves a pending act queue behind, which silently
 * swallows the next render — the component tree comes back null and
 * every getByTestId fails for reasons that look nothing like the
 * cause.
 */
async function seedSession(streamType: 'video' | 'audio' = 'audio') {
  await act(async () => {
    useNowPlayingStore
      .getState()
      .begin({
        uri: 'file:///a.mp3',
        title: 'Track Title',
        startPositionMs: 0,
        streamType,
      });
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockStopPlayback.mockReset();
  await act(async () => {
    useNowPlayingStore.getState().reset();
    useAudioPresentationStore.setState({mode: 'expanded'});
    // The presentation store is process-global, so a test that sets a
    // mini video presentation leaks into every later test in this file
    // unless it is put back here.
    usePresentationStore.setState({
      videoPresentation: 'expanded',
      pipActive: false,
    });
  });
});

describe('PlayerChrome — visibility', () => {
  it('renders nothing when no track is loaded', async () => {
    const {toJSON} = await render(<PlayerChrome />);
    expect(toJSON()).toBeNull();
  });

  it('renders the audio player when a session exists', async () => {
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);
    expect(getByTestId('audio-playpause')).toBeTruthy();
  });

  it('renders the dock and hides the full page when the mode is mini', async () => {
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    const {getByTestId, queryByTestId} = await render(<PlayerChrome />);

    expect(getByTestId('audio-dock')).toBeTruthy();
    // The full page is still MOUNTED — that is D9 — but it is not
    // exposed: `display: none` takes it out of the accessibility tree,
    // which is what a hidden control has to mean on a device.
    expect(
      queryByTestId('audio-playpause', {includeHiddenElements: false}),
    ).toBeNull();
  });

  // A video launch writes a session too.
  //
  // V21 F5: this test used to pass because of the `isPlayerActivity` gate
  // ("this tree is behind the player Activity, draw nothing"). That gate
  // is gone with the second Activity, so the test now passes for a
  // completely different reason — the video lane is hosted by
  // `VideoPlayer`, and this host is the AUDIO lane's host.
  it('renders nothing for a VIDEO launch — the video lane is hosted elsewhere', async () => {
    await seedSession('video');
    const {toJSON} = await render(<PlayerChrome />);
    expect(toJSON()).toBeNull();
  });

  it('does not offer audio chrome on a video session', async () => {
    await seedSession('video');
    const {queryByTestId} = await render(<PlayerChrome />);

    expect(queryByTestId('audio-mute')).toBeNull();
    expect(queryByTestId('audio-queue')).toBeNull();
    expect(queryByTestId('audio-mini-toggle')).toBeNull();
    expect(queryByTestId('audio-dock')).toBeNull();
  });
});

describe('PlayerChrome — D9: one mounted tree per lane', () => {
  it('the dock and the full page are the SAME mounted tree', async () => {
    // The dock is not a rival component that takes turns — it is a part of
    // the audio lane, and it is mounted in both presentations. If the lane
    // ever went back to two components, the dock would be absent from the
    // expanded tree and this would fail.
    //
    // `includeHiddenElements` is on because the dock is `display: none`
    // while the page is up: RNTL hides it from queries by default, which
    // is exactly right for what the USER can reach and exactly wrong for
    // "is it still mounted?".
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);

    expect(getByTestId('audio-dock', {includeHiddenElements: true})).toBeTruthy();
    expect(getByTestId('audio-playpause')).toBeTruthy();
  });

  it('survives a presentation change without losing either part', async () => {
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });

    expect(getByTestId('audio-dock')).toBeTruthy();
    expect(
      getByTestId('audio-playpause', {includeHiddenElements: true}),
    ).toBeTruthy();
  });

  it('hides the page from the accessibility tree while the dock is up', async () => {
    // `display: none` is not just a visual state: it takes the hidden
    // controls out of the accessibility tree, so a screen reader does not
    // announce a full player that the user cannot see.
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    const {queryByTestId} = await render(<PlayerChrome />);

    expect(
      queryByTestId('audio-playpause', {includeHiddenElements: false}),
    ).toBeNull();
  });
});

describe('PlayerChrome — close is a real teardown', () => {
  it('calls the native stopPlayback primitive', async () => {
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    expect(mockStopPlayback).toHaveBeenCalledTimes(1);
  });

  it('does NOT fall back to the lib stop command, which leaves the session posted', async () => {
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);

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
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-close'));
    });

    expect(useNowPlayingStore.getState().current).toBeNull();
  });

  // The case that would otherwise ship silently: audio keeps playing
  // behind a dismissed player and the user has no way to tell.
  it('keeps the player up and reports the error when the native stop fails', async () => {
    await seedSession();
    mockStopPlayback.mockImplementation(() => {
      throw new Error('service refused to stop');
    });
    const {getByTestId} = await render(<PlayerChrome />);

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

  it('the dock closes through the same native path', async () => {
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-dock-close'));
    });

    expect(mockStopPlayback).toHaveBeenCalledTimes(1);
  });
});

describe('PlayerChrome — minimize does not touch playback', () => {
  it('collapses to the dock without stopping anything', async () => {
    await seedSession();
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-mini-toggle'));
    });

    expect(useAudioPresentationStore.getState().mode).toBe('mini');
    expect(mockStopPlayback).not.toHaveBeenCalled();
    expect(mockCommandsStop).not.toHaveBeenCalled();
    expect(useNowPlayingStore.getState().current).not.toBeNull();
  });
});

/**
 * The hardware back, in the audio lane.
 *
 * The Android back button is the platform's "leave this screen" verb, and
 * SPEC §3.2 gives it exactly ONE meaning: CLOSE. The older "back
 * minimises" rule was withdrawn on purpose, and the SPEC names
 * `useClosePlayback()` as the single owner precisely so "the dock's X, the
 * audio player's X, the header's back and the hardware back cannot drift
 * apart".
 *
 * So the expanded audio page owes the platform the same verb its own X
 * offers — and the DOCK does not, because as a bar over the browsing stack
 * it is not a screen of its own; back there belongs to the stack.
 *
 * `BackHandler` is a no-op stub under the jest preset's default platform, so
 * the subscription is captured with a spy and the handler is invoked by
 * hand. What is asserted is the CONTRACT: is a handler registered, and what
 * does it do.
 */
describe('PlayerChrome — the hardware back closes the expanded audio page', () => {
  // The real signature, taken from RN's own type so the mock cannot drift
  // from it.
  type BackPressEventName = Parameters<
    typeof BackHandler.addEventListener
  >[0];
  type BackPressHandler = Parameters<typeof BackHandler.addEventListener>[1];

  let backHandlers: Array<() => boolean | null | undefined>;

  beforeEach(() => {
    backHandlers = [];
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((event: BackPressEventName, handler: BackPressHandler) => {
        if (event === 'hardwareBackPress') {
          backHandlers.push(() =>
            handler({type: 'hardwareBackPress', timeStamp: 0}),
          );
        }
        return {remove: () => {}};
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes the session through the same native teardown as the X', async () => {
    await seedSession();
    await render(<PlayerChrome />);

    expect(backHandlers).toHaveLength(1);

    let consumed: boolean | null | undefined = false;
    await act(async () => {
      consumed = backHandlers[0]();
    });

    // The press is CONSUMED — returning false would let it fall through to
    // the platform and close the whole app while a track is on screen.
    expect(consumed).toBe(true);
    expect(mockStopPlayback).toHaveBeenCalledTimes(1);
    expect(useNowPlayingStore.getState().current).toBeNull();
  });

  it('does NOT swallow the back press while the dock is up', async () => {
    await seedSession();
    await act(async () => {
      useAudioPresentationStore.setState({mode: 'mini'});
    });
    await render(<PlayerChrome />);

    // As a bar over the browsing stack the dock is not a screen of its own:
    // back belongs to the stack, and at the stack's root to the platform.
    expect(backHandlers).toHaveLength(0);
  });

  it('does not register a handler for a video session', async () => {
    // The video lane is hosted elsewhere and owns its own back handler.
    // Two owners of one press is how one of them becomes a no-op.
    await seedSession('video');
    await render(<PlayerChrome />);

    expect(backHandlers).toHaveLength(0);
  });
});
/**
 * Volume, mute and queue — the three controls the player was missing.
 *
 * `HelpScreen.tsx:79` has been telling users to "tap the queue/list icon"
 * since before it existed. These pin that each control reaches a real
 * verb, because a button that renders and does nothing is the precise
 * definition of the jugaad this audit is removing.
 */
describe('PlayerChrome — volume, mute and queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransportState.isMuted = false;
    mockTransportState.volume = 100;
  });

  it('renders all three controls on the expanded audio player', async () => {
    await seedSession('audio');
    const {getByTestId} = await render(<PlayerChrome />);

    expect(getByTestId('audio-mute')).toBeTruthy();
    expect(getByTestId('audio-queue')).toBeTruthy();
    expect(getByTestId('audio-volume')).toBeTruthy();
  });

  it('mute mutes — it does not stop', async () => {
    await seedSession('audio');
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-mute'));
    });

    expect(mockSetMuted).toHaveBeenCalledWith(true);
    // The distinct verbs matter: mute silences, close tears down.
    expect(mockCommandsStop).not.toHaveBeenCalled();
    expect(mockStopPlayback).not.toHaveBeenCalled();
  });

  it('unmutes when already muted', async () => {
    mockTransportState.isMuted = true;
    await seedSession('audio');
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-mute'));
    });

    expect(mockSetMuted).toHaveBeenCalledWith(false);
  });

  it('the queue minimizes first, then navigates with from:audio', async () => {
    await seedSession('audio');
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent.press(getByTestId('audio-queue'));
    });

    // Navigating without minimizing would push a route BEHIND an opaque
    // full-screen player, so the tap would look broken.
    expect(useAudioPresentationStore.getState().mode).toBe('mini');
    expect(mockNavigate).toHaveBeenCalledWith('Queue', {from: 'audio'});
  });

  it('dragging the volume up from muted unmutes as well as sets level', async () => {
    mockTransportState.isMuted = true;
    mockTransportState.volume = 0;
    await seedSession('audio');
    const {getByTestId} = await render(<PlayerChrome />);

    await act(async () => {
      fireEvent(getByTestId('audio-volume'), 'valueChange', 40);
    });

    // Without the unmute, the slider would look pinned at 0 while being
    // dragged, which reads as a dead control.
    expect(mockSetMuted).toHaveBeenCalledWith(false);
    expect(mockSetVolume).toHaveBeenCalledWith(40);
  });
});
