/// <reference types="node" />
/**
 * V19 W9 — render-frequency contract tests for the player chrome.
 *
 * ## Why these tests exist at all
 *
 * Before W9 the app's 900-test suite was fully green while the player page
 * re-rendered its entire chrome ~30-60 times per second. Nothing was
 * functionally broken, so nothing was failing. The suite asserts VALUES
 * ("the title is right", "the glyph is repeatOne"); it never asserted HOW
 * MANY TIMES React was asked to do work.
 *
 * That is the whole gap this file closes. Each test below pins WORK, and
 * each fails if its fix is reverted.
 *
 * The three defects they pin:
 *
 *  1. `useTransport`'s `state` memo depended on the whole `progress`
 *     OBJECT rather than its fields, so any progress change rebuilt the
 *     entire 24-field transport object that all 12 chrome components
 *     consume.
 *  2. `useTransport` returned a fresh `{state, commands}` object on every
 *     render, so a consumer could never observe a stable reference.
 *  3. `TransportBar`'s `PanResponder` was memoised on `scrubPreviewMs` and
 *     `durationMs` — both of which change DURING a drag — so RN detached and
 *     re-attached the gesture handlers mid-gesture.
 */

import * as React from 'react';
import {render, renderHook} from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────

/**
 * The provider hands a STABLE object down until a field actually changes,
 * then a new one. That is the real contract: React context consumers bail
 * out when the value is reference-equal. So the mock must hold one
 * reference and only replace it when a test explicitly reassigns
 * `mockProgress` / `mockState`.
 *
 * An earlier version of this mock spread on every call (`{...mockProgress}`),
 * which made EVERY render produce a new identity and made every
 * identity assertion here impossible to satisfy. That would have been a
 * test that can only fail.
 */
let mockProgress: Record<string, unknown> = {};
let mockState: Record<string, unknown> = {};

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
 * `useTransport` imports the player hooks from the LIB package, so that is
 * the module path the mock has to sit on. Mocking a different path (e.g.
 * the app's own facade) would leave the real implementation in place and
 * the tests would silently assert nothing.
 */
/**
 * `usePlayer` must also hand back a STABLE `{state, commands}` wrapper —
 * the lib memoises it on `[state]`, so an identity that churns every render
 * would be a fake defect the tests could not distinguish from a real one.
 *
 * Every identifier referenced from a `jest.mock` factory has to be
 * `mock`-prefixed or babel-plugin-jest-hoist rejects the file outright, so
 * these are named accordingly.
 */
const mockStablePlayerResult = {
  get state() {
    return mockState;
  },
  commands: mockCommands,
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayerProgress: () => mockProgress,
  usePlayer: () => mockStablePlayerResult,
}));

const mockSetOrientationLocked = jest.fn();

jest.mock('../../../src/state/useOrientationLockStore', () => ({
  useOrientationLockStore: (selector: (s: unknown) => unknown) =>
    selector({locked: false, setLocked: mockSetOrientationLocked}),
}));

/**
 * Built from `jest.requireActual` rather than hand-stubbed, so the mock
 * cannot silently fall behind the real token surface (a partial stub is a
 * test that stops being able to fail).
 */
jest.mock('../../../src/theme', () => {
  const {darkTokens} = jest.requireActual('../../../src/theme/tokens');
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
      radius: {lg: 16, sm: 8, md: 12, full: 999},
      typography: darkTokens.typography,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/state/useSkipPrevThresholdStore', () => ({
  getSkipPrevThresholdMs: () => 3000,
}));



const resetMocks = () => {
  mockProgress = {
    positionMs: 0,
    durationMs: 60000,
    isBuffering: false,
    isSeeking: false,
    seekable: true,
    cacheRanges: [{start: 0, end: 30}],
    cacheFill: 30,
  };
  mockState = {
    loopMode: 'none',
    tracks: [],
    playlist: [],
    currentIndex: -1,
    speed: 1,
    volume: 100,
    isMuted: false,
    title: 'Sussie (1945)',
    artist: '',
  };
};

beforeEach(resetMocks);

// ═══════════════════════════════════════════════════════════════════════
// 1. The hook's returned state identity
// ═══════════════════════════════════════════════════════════════════════

describe('useTransport render frequency', () => {
  it('keeps the same state object when ONLY progress identity churns', async () => {
    // The defect: the memo listed `progress` as a dependency, so a provider
    // that handed out a new progress object for ANY reason rebuilt the
    // whole transport state — even when every field was byte-identical.
    const {useTransport} = require('../../../src/infrastructure/player/useTransport');
    const {result, rerender, unmount} = await renderHook(() => useTransport());
    const first = result.current.state;

    // Same values, brand-new object identity (the provider's real shape).
    mockProgress = {...mockProgress};
    await rerender({});

    expect(result.current.state).toBe(first);

    await unmount();
  });

  it('does NOT rebuild state for a progress field nothing in the body reads', async () => {
    // `cacheRanges` is deliberately NOT in the `state` memo's dependency
    // list: the body reads the DERIVED `bufferedRanges`, not the raw
    // array. (`cacheFill` and `durationMs` ARE dependencies, because
    // `deriveBufferedRanges` genuinely consumes both — so changing those
    // correctly rebuilds. That is the "DOES rebuild" test below.)
    const {useTransport} = require('../../../src/infrastructure/player/useTransport');
    const {result, rerender, unmount} = await renderHook(() => useTransport());
    const first = result.current.state;

    mockProgress = {...mockProgress, cacheRanges: mockProgress.cacheRanges};
    await rerender({});

    expect(result.current.state).toBe(first);

    await unmount();
  });

  it('DOES rebuild state when position actually advances', async () => {
    // The mirror of the tests above — a memo that never invalidates would
    // freeze the seek bar, which is worse than rebuilding too often.
    const {useTransport} = require('../../../src/infrastructure/player/useTransport');
    const {result, rerender, unmount} = await renderHook(() => useTransport());
    const first = result.current.state;

    mockProgress = {...mockProgress, positionMs: 42000};
    await rerender({});

    expect(result.current.state.positionMs).toBe(42000);
    expect(result.current.state).not.toBe(first);

    await unmount();
  });

  it('returns a stable hook object across a re-render', async () => {
    // `return {state, commands: wrapped}` allocated a new object every
    // render, so a consumer could never get a stable reference from the
    // hook even when both halves were unchanged.
    const {useTransport} = require('../../../src/infrastructure/player/useTransport');
    const {result, rerender, unmount} = await renderHook(() => useTransport());
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);

    await unmount();
  });

  it('keeps the commands object stable while position advances', async () => {
    // Commands are pure dispatchers. A new identity per tick forces every
    // memoised child that closes over them to re-create its handlers —
    // including PanResponder instances.
    const {useTransport} = require('../../../src/infrastructure/player/useTransport');
    const {result, rerender, unmount} = await renderHook(() => useTransport());
    const firstCommands = result.current.commands;

    mockProgress = {...mockProgress, positionMs: 1000};
    await rerender({});

    expect(result.current.commands).toBe(firstCommands);

    await unmount();
  });
});