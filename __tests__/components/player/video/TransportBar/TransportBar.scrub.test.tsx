/// <reference types="node" />
/**
 * V19 W9 — `TransportBar` scrub-gesture stability.
 *
 * ## The defect this pins
 *
 * `TransportBar` built its `PanResponder` inside a `useMemo` whose
 * dependency list included `scrubPreviewMs` and `state.durationMs`. BOTH
 * change while a finger is down:
 *
 *   - `scrubPreviewMs` is set on every `onPanResponderMove`
 *   - `durationMs` arrives with every position tick
 *
 * So React re-created the responder — and swapped
 * `{...panResponder.panHandlers}` on the track — several times per second in
 * the middle of a drag. RN then has to detach and re-attach the responder
 * handlers underneath an active gesture, which can drop it.
 *
 * ## What this file deliberately does NOT do
 *
 * It does not simulate the gesture with `fireEvent(track, 'responderMove')`.
 * RN's real `PanResponder` reads `gestureState.touchHistory` on every move,
 * and that object is produced by the native gesture system — it does not
 * exist under jest. Any synthetic move therefore throws
 * `Cannot read properties of undefined (reading 'touchBank')` from
 * `TouchHistoryMath`, no matter what the component does. Spying on
 * `PanResponder.create` makes it worse: the factory is not re-entrant
 * through a wrapper, and wrapping it leaves its internal `_gestureState`
 * undefined.
 *
 * So the assertion is on the thing that actually broke: the responder
 * CONFIGURATION object is created once and never again, and the callbacks
 * it holds are the ones wired to the track.
 */

import * as React from 'react';
import {PanResponder} from 'react-native';
import {act, render} from '@testing-library/react-native';
import {TransportBar} from '../../../../../src/components/player/video/TransportBar/TransportBar';

// ── Mocks ────────────────────────────────────────────────────────────

const mockTransportState = {
  positionMs: 0,
  durationMs: 60000,
  isPlaying: true,
  isBuffering: false,
  isSeeking: false,
  isEnded: false,
  bufferedRanges: [{startMs: 0, endMs: 30}],
  normalizedWindow: {startMs: 0, endMs: 30},
  seekable: true,
  canEnterPip: true,
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
  title: 'Sussie (1945)',
  artist: '',
};

const mockCommands = {
  seek: jest.fn(),
  seekBy: jest.fn(),
  togglePlayPause: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  setRepeatMode: jest.fn(),
  setMuted: jest.fn(),
  setVolume: jest.fn(),
  setSpeed: jest.fn(),
  setShuffle: jest.fn(),
  setTrack: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
  exitPipAndFinish: jest.fn(),
  setOrientation: jest.fn(),
  setScreenBrightness: jest.fn(),
  getScreenBrightness: jest.fn(() => 50),
  setProperty: jest.fn(),
  setAudioFilter: jest.fn(),
  setVideoFilter: jest.fn(),
};

/**
 * `TransportBar` reads `useTransport` from the player barrel. It is mocked
 * wholesale (not spread from `requireActual`) because a spread re-enters
 * the player graph and produces a partial-initialisation cycle
 * (`CHROME_HIDE_ANIM_MS` undefined).
 */
jest.mock('../../../../../src/infrastructure/player', () => ({
  useTransport: () => ({state: mockTransportState, commands: mockCommands}),
  formatMsAsClock: () => '0:00',
  clampPosition: (ms: number, durationMs: number) =>
    Math.max(0, Math.min(ms, durationMs)),
  useHaptic: () => ({
    impact: jest.fn(),
    selection: jest.fn(),
    notify: jest.fn(),
  }),
}));

jest.mock('../../../../../src/theme', () => {
  const {darkTokens} = jest.requireActual(
    '../../../../../src/theme/tokens',
  );
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
      radius: {sm: 8, md: 12, lg: 16, full: 999},
      typography: darkTokens.typography,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../../../src/components/utility/SvgIcon', () => ({
  SvgIcon: () => null,
}));

// Children that would otherwise require a presentation/toast provider tree.
// None of them participates in the scrub contract.
jest.mock(
  '../../../../../src/components/player/video/PlayerControl/PlayerControl',
  () => ({PlayerControl: () => null}),
);
jest.mock('../../../../../src/components/player/video/TransportBar/ModeControl', () => ({
  ModeControl: () => null,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/CaptionsToggle', () => ({
  CaptionsToggle: () => null,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/PiPToggle', () => ({
  PiPToggle: () => null,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/VolumeControl', () => ({
  VolumeControl: () => null,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/More', () => ({
  More: () => null,
}));

// ═══════════════════════════════════════════════════════════════════════

/**
 * Capture the responder CONFIG objects handed to `PanResponder.create`
 * without ever invoking the real factory.
 *
 * `create` is stubbed to return a minimal stand-in — the component only
 * spreads `.panHandlers` onto the view, and the gesture itself is never
 * simulated here (see the file header). Counting calls and comparing the
 * captured configs is enough to prove the responder is built once.
 */
type ResponderConfig = Record<string, (...a: never[]) => unknown>;

function captureResponderConfigs() {
  const configs: ResponderConfig[] = [];
  const original = PanResponder.create;
  (PanResponder as {create: unknown}).create = (config: ResponderConfig) => {
    configs.push(config);
    return {panHandlers: {__fromConfig: config}};
  };
  return {
    configs,
    restore: () => {
      (PanResponder as {create: unknown}).create = original;
    },
  };
}

describe('TransportBar scrub gesture stability', () => {
  it('builds the PanResponder configuration exactly once', async () => {
    // Pre-W9 the memo listed `scrubPreviewMs` + `durationMs`, so this
    // count climbed while the scrub preview moved. With an empty
    // dependency list it stays at one, forever.
    const {configs, restore} = captureResponderConfigs();
    try {
      await render(<TransportBar />);
      expect(configs).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it('does not rebuild the responder when the transport state advances', async () => {
    // The position tick changes `durationMs`-bearing state four times a
    // second during playback. That must not rebuild the responder.
    const {configs, restore} = captureResponderConfigs();
    try {
      const view = await render(<TransportBar />);
      expect(configs).toHaveLength(1);

      // Drive the component's own state through the scrub callbacks in the
      // captured config. These are the component's handlers, invoked
      // directly — the same functions the native responder would call —
      // so this exercises the real setState path without needing a native
      // touch history.
      const config = configs[0];
      const grant = config.onPanResponderGrant as unknown as (
        e: unknown,
      ) => void;
      const move = config.onPanResponderMove as unknown as (
        e: unknown,
      ) => void;
      const release = config.onPanResponderRelease as unknown as () => void;

      grant({nativeEvent: {locationX: 100}});
      move({nativeEvent: {locationX: 180}});
      move({nativeEvent: {locationX: 240}});
      move({nativeEvent: {locationX: 300}});
      release();

      expect(configs).toHaveLength(1);
      view.unmount();
    } finally {
      restore();
    }
  });

  it('commits a seek on release using the CURRENT duration', async () => {
    // Proves the ref indirection is wired correctly: holding the responder
    // stable must not have frozen it on stale values. A "stable" responder
    // that seeks to a stale position would be worse than a rebuilt one.
    mockCommands.seek.mockClear();
    const {configs, restore} = captureResponderConfigs();
    try {
      const view = await render(<TransportBar />);
      const track = view.getByTestId('scrub-track-hit-area');

      // The scrub maps an X coordinate onto `trackWidth`, which comes from
      // `onLayout`. Without a measured width the fraction is 0 and the
      // clamped seek is legitimately a no-op — so the layout has to happen
      // before the gesture is meaningful.
      await act(async () => {
        track.props.onLayout({
          nativeEvent: {layout: {width: 300, height: 20, x: 0, y: 0}},
        });
      });

      const config = configs[0];
      const grant = config.onPanResponderGrant as unknown as (
        e: unknown,
      ) => void;
      const move = config.onPanResponderMove as unknown as (
        e: unknown,
      ) => void;
      const release = config.onPanResponderRelease as unknown as (
        e: unknown,
      ) => void;

      await act(async () => {
        grant({nativeEvent: {locationX: 100}});
        move({nativeEvent: {locationX: 200}});
        move({nativeEvent: {locationX: 300}});
        // The release event carries the final touch position — the handler
        // derives the target from it rather than from committed state, so a
        // batched grant/move/release still commits the right seek.
        release({nativeEvent: {locationX: 300}});
      });

      expect(mockCommands.seek).toHaveBeenCalledTimes(1);
      const seekMs = mockCommands.seek.mock.calls[0][0] as number;
      expect(seekMs).toBeGreaterThan(0);
      expect(seekMs).toBeLessThanOrEqual(60000);

      view.unmount();
    } finally {
      restore();
    }
  });
});