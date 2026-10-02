/**
 * Shared test fixture for the mocked transport surface.
 *
 * **Why this exists.** The V19 chrome component tests each hand-rolled
 * their own partial `mockTransport.state`. Those partials drifted from
 * the real `TransportState` in both directions, and the failures were
 * silent and confusing:
 *
 *   - a field the component reads was missing →
 *       `TypeError: Cannot read properties of undefined (reading
 *        'length')` (e.g. `captionTracks` in `CaptionsToggle`)
 *   - a field the component no longer has was still declared (the
 *     tests still listed a `step` command long after it was removed
 *     from the facade)
 *
 * `makeTransportState()` returns a COMPLETE, correctly-typed
 * `TransportState`, so a new field is covered automatically and a
 * removed one is a compile error. Tests override only what they
 * actually assert on.
 *
 * ```tsx
 * const state = makeTransportState({isPlaying: false, durationMs: 0});
 * ```
 *
 * Architecture source of truth: `src/infrastructure/player/useTransport.ts`
 * (the `TransportState` / `TransportCommands` contracts).
 */

import type {
  TransportCommands,
  TransportState,
} from '../../src/infrastructure/player';

/**
 * A complete `TransportState` with sensible defaults, overridden by
 * `overrides`. Defaults describe a 4:00 item playing at 1:00.
 */
export function makeTransportState(
  overrides: Partial<TransportState> = {},
): TransportState {
  return {
    positionMs: 60_000,
    durationMs: 240_000,
    isPlaying: true,
    isBuffering: false,
    isSeeking: false,
    isEnded: false,
    bufferedRanges: [{startMs: 0, endMs: 120_000}],
    normalizedWindow: {startMs: 0, endMs: 120_000},
    seekable: true,
    canEnterPip: true,
    // Orientation lock released by default: the common case, and it
    // keeps the lock button rendering its `unlock` glyph.
    isOrientationLocked: false,
    repeatMode: 'off',
    // Empty by default: several chrome components render nothing when
    // there are no caption tracks (`CaptionsToggle` returns null), so a
    // test that wants the captions slot must opt in explicitly.
    captionTracks: [],
    activeCaptionTrackId: null,
    canGoPrev: false,
    canGoNext: false,
    currentUri: null,
    nextTrack: null,
    speed: 1,
    volume: 100,
    isMuted: false,
    title: '',
    artist: '',
    ...overrides,
  };
}

/**
 * A complete `TransportCommands` where every method is a `jest.fn()`.
 * Tests can then assert `expect(commands.play).toHaveBeenCalled()`.
 */
export function makeTransportCommands(): jest.Mocked<TransportCommands> {
  const fn = () => jest.fn();
  return {
    seek: fn(),
    seekBy: fn(),
    togglePlayPause: fn(),
    play: fn(),
    pause: fn(),
    setRepeatMode: fn(),
    selectCaptionTrack: fn(),
    next: fn(),
    previous: fn(),
    rewind10: fn(),
    forward10: fn(),
    skipPrev: fn(),
    setSpeed: fn(),
    setVolume: fn(),
    setScreenBrightness: fn(),
    getScreenBrightness: jest.fn(() => 50),
    setProperty: fn(),
    setAudioFilter: fn(),
    setVideoFilter: fn(),
    setShuffle: fn(),
    enterPip: fn(),
    exitPip: fn(),
    close: fn(),
    // V19 W6.4 — the header's two real actions.
    exitPlayer: fn(),
    setOrientationLock: fn(),
  } as unknown as jest.Mocked<TransportCommands>;
}
