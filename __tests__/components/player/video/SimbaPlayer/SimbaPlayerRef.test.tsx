/**
 * W9.3 — the `SimbaPlayer` imperative ref contract.
 *
 * ## Why this test exists
 *
 * The ref object used to be closed with `as unknown as SimbaPlayerRef`.
 * That double cast is not a style nit — it disabled the single check
 * that would have caught two real defects:
 *
 *   1. **Nine members returned `void` where the interface promised
 *      `Promise<void>`.** A file-level `run()` helper existed for
 *      exactly this, with a comment explaining it, and `play` / `pause`
 *      / `togglePlayPause` / `close` used it — but `seek`, `skip`,
 *      `setVolume`, `setSpeed`, `setVideoQuality`, `setLoopMode`,
 *      `setShuffle` and `selectCaptionTrack` were plain arrows. A
 *      consumer writing `await ref.setVolume(0.5)` got `undefined`.
 *
 *   2. **Four members threw unconditionally** (`open`, `openWithResume`,
 *      `openPlaylist`, `selectAudioDescriptionTrack`) while type-checking
 *      perfectly. A method that compiles and always fails is strictly
 *      worse than a missing one: `tsc` endorses the call site and the
 *      app dies when the user presses play.
 *
 * Both are now closed: every void-returning member routes through
 * `run`, the object uses `satisfies SimbaPlayerRef` instead of the
 * double cast, and the four throwers are gone.
 *
 * ## What is asserted
 *
 * The load-bearing property is #1, and it is asserted over the WHOLE
 * surface rather than method by method: every command on the ref is
 * `async`, so `await` works uniformly. That is mutation-checkable -
 * removing one `run(...)` breaks exactly one member and the test names
 * it.
 */

import * as React from 'react';
import {render, waitFor} from '@testing-library/react-native';

const mockCommands: Record<string, jest.Mock> = {
  play: jest.fn(),
  pause: jest.fn(),
  togglePlayPause: jest.fn(),
  seek: jest.fn(),
  seekBy: jest.fn(),
  forward10: jest.fn(),
  rewind10: jest.fn(),
  setVolume: jest.fn(),
  setSpeed: jest.fn(),
  setProperty: jest.fn(),
  setRepeatMode: jest.fn(),
  setShuffle: jest.fn(),
  selectCaptionTrack: jest.fn(),
  close: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
};

const mockSetPipActive = jest.fn();
const mockSetPreset = jest.fn();
const mockSetSkipSilence = jest.fn();

jest.mock('../../../../../src/infrastructure/player', () => ({
  useTransport: () => ({
    state: {
      currentUri: 'file:///movies/film.mkv',
      title: 'Film',
      durationMs: 600_000,
      positionMs: 42_000,
      isPlaying: true,
      isBuffering: false,
      isSeeking: false,
      seekable: true,
      speed: 1,
      volume: 100,
      isMuted: false,
    },
    commands: mockCommands,
  }),
  usePresentation: () => ({setPipActive: mockSetPipActive}),
  useChromeAutoHide: () => ({}),
  usePipBridge: () => ({}),
  useCaptionStyleBridge: () => ({}),
  ChromeAutoHideProvider: ({children}: {children: React.ReactNode}) => (
    <>{children}</>
  ),
}));

jest.mock('../../../../../src/state/useQualityStore', () => ({
  presetToMpv: (preset: string) => ({
    hwdec: `${preset}-hwdec`,
    profile: `${preset}-profile`,
  }),
  useQualityStore: (sel: (s: unknown) => unknown) =>
    sel({setPreset: mockSetPreset}),
}));

jest.mock('../../../../../src/state/useSkipSilenceStore', () => ({
  useSkipSilenceStore: {
    getState: () => ({setEnabled: mockSetSkipSilence}),
  },
}));

// Every chrome primitive renders null — this suite is about the ref,
// not the visual tree, and pulling the real chrome in would drag the
// whole lib context tree along with it.
const passthrough = () => null;
jest.mock('../../../../../src/components/player/video/VideoSurface/VideoSurface', () => ({
  VideoSurface: passthrough,
}));
jest.mock('../../../../../src/components/player/video/PlayerScrim/PlayerScrim', () => ({
  PlayerScrim: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoTitleOverlay/VideoTitleOverlay', () => ({
  VideoTitleOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay', () => ({
  VideoLoadingOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay', () => ({
  VideoErrorOverlay: passthrough,
}));
jest.mock('../../../../../src/components/player/video/TransportBar/TransportBar', () => ({
  TransportBar: passthrough,
}));
jest.mock('../../../../../src/components/player/video/ChromeAutoHide/ChromeAutoHideController', () => ({
  ChromeAutoHideController: passthrough,
}));
jest.mock('../../../../../src/components/player/video/Gestures/VerticalSwipeGestures', () => ({
  VerticalSwipeGestures: passthrough,
}));
jest.mock('../../../../../src/components/player/video/NextUp/NextUpOverlay', () => ({
  NextUpOverlay: passthrough,
}));
jest.mock('../../../../../src/components/StatusBar', () => ({
  SimbaStatusBar: passthrough,
}));

import {SimbaPlayer} from '../../../../../src/components/player/video/SimbaPlayer/SimbaPlayer';
import type {SimbaPlayerRef} from '../../../../../src/components/player/video/SimbaPlayer/types';

const SOURCE = {
  uri: 'file:///movies/film.mkv',
  title: 'Film',
  kind: 'movie' as const,
};

async function mountRef(): Promise<SimbaPlayerRef> {
  const ref = React.createRef<SimbaPlayerRef>();
  await render(<SimbaPlayer ref={ref} source={SOURCE} />);
  await waitFor(() => expect(ref.current).not.toBeNull());
  return ref.current as SimbaPlayerRef;
}

describe('SimbaPlayer ref — contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes no method that throws unconditionally', async () => {
    // The removed launch trio + AD selector would each have thrown.
    // Asserting their ABSENCE is the regression guard: re-adding a
    // guaranteed-thrower to a public ref is exactly the defect.
    const ref = await mountRef();

    for (const removed of [
      'open',
      'openWithResume',
      'openPlaylist',
      'selectAudioDescriptionTrack',
    ] as const) {
      expect((ref as unknown as Record<string, unknown>)[removed]).toBeUndefined();
    }
  });

  it('returns a Promise from EVERY command, so `await` works uniformly', async () => {
    // The core regression. Pre-W9.3 nine members returned `void`; a
    // consumer's `await ref.setVolume(0.5)` resolved to `undefined`.
    // Asserted over the whole surface at once, so dropping a single
    // `run(...)` fails here and names that member.
    const ref = await mountRef();
    // `SimbaPlayerRef` types every command as `Promise<void>`, so calling
    // it is already known to be safe - this table exists to iterate them,
    // not to re-prove their types. Cast through a callable record so the
    // loop can index by name.
    const handle = ref as unknown as Record<string, (...args: unknown[]) => unknown>;

    const expected: Array<[string, () => unknown]> = [
      ['play', () => handle.play()],
      ['pause', () => handle.pause()],
      ['togglePlayPause', () => handle.togglePlayPause()],
      ['seek', () => handle.seek(1000)],
      ['seekRelative', () => handle.seekRelative(10_000)],
      ['skip', () => handle.skip('forward')],
      ['setVolume', () => handle.setVolume(50)],
      ['setSpeed', () => handle.setSpeed(1.5)],
      ['setVideoQuality', () => handle.setVideoQuality('high-quality')],
      ['setLoopMode', () => handle.setLoopMode('file')],
      ['setShuffle', () => handle.setShuffle(true)],
      ['selectCaptionTrack', () => handle.selectCaptionTrack('2')],
      ['setSkipSilence', () => handle.setSkipSilence(true)],
      ['close', () => handle.close()],
      ['enterPip', () => handle.enterPip()],
      ['exitPip', () => handle.exitPip()],
    ];

    for (const [name, invoke] of expected) {
      const result = invoke();
      expect(
        typeof (result as {then?: unknown})?.then,
      ).toBe('function');
      await result;
    }
  });

  it('still routes each command to the real lib command', async () => {
    // The mirror of the test above: wrapping everything in `run`
    // without forwarding the argument would make the previous test
    // pass while every control did nothing.
    const ref = await mountRef();

    await ref.seek(1234);
    expect(mockCommands.seek).toHaveBeenCalledWith(1234);

    await ref.seekRelative(10_000);
    expect(mockCommands.seekBy).toHaveBeenCalledWith(10_000);

    await ref.skip('backward');
    expect(mockCommands.rewind10).toHaveBeenCalled();

    await ref.setVolume(37);
    expect(mockCommands.setVolume).toHaveBeenCalledWith(37);

    await ref.setSpeed(1.5);
    expect(mockCommands.setSpeed).toHaveBeenCalledWith(1.5);

    await ref.selectCaptionTrack('2');
    expect(mockCommands.selectCaptionTrack).toHaveBeenCalledWith(2);

    // Non-numeric track id is "no track", not NaN.
    mockCommands.selectCaptionTrack.mockClear();
    await ref.selectCaptionTrack('not-a-number');
    expect(mockCommands.selectCaptionTrack).toHaveBeenCalledWith(null);
  });

  it('maps quality through the same preset the More sheet uses', async () => {
    const ref = await mountRef();

    await ref.setVideoQuality('high-quality');

    expect(mockCommands.setProperty).toHaveBeenCalledWith('hwdec', 'high-quality-hwdec');
    expect(mockCommands.setProperty).toHaveBeenCalledWith('profile', 'high-quality-profile');
    expect(mockSetPreset).toHaveBeenCalledWith('high-quality');
  });

  it('falls back to the balanced preset for an unknown quality name', async () => {
    // A control that silently does nothing is worse than one that
    // picks a safe default.
    const ref = await mountRef();

    await ref.setVideoQuality('nonsense');

    expect(mockSetPreset).toHaveBeenCalledWith('balanced');
  });

  it('exposes read-only dock values', async () => {
    const ref = await mountRef();

    expect(ref.getCurrentUri()).toBe('file:///movies/film.mkv');
    expect(ref.getCurrentTitle()).toBe('Film');
    expect(ref.getCurrentArtwork()).toBeNull();
  });
});