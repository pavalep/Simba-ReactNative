/**
 * V21 W7 P26 — `usePlayWithResume` hook tests.
 *
 * The hook is the only "real wrapper" in the V21 player facade
 * (the 9 P10 re-exports + P25's `usePlayerProgress` stay pure
 * re-exports; see `__tests__/infrastructure/player.test.ts`).
 *
 * Two pre-P26 bugs motivated the hook:
 *   1. `HistoryScreen.handlePress` was passing `startPositionMs: position`
 *      where `position` was in seconds and the field expects ms
 *      → every resume seek was 1000x too small.
 *   2. `useBookmarksScreen.handlePress` was not passing
 *      `startPositionMs` at all → bookmark positions were silently
 *      ignored.
 *
 * These tests mock the player module's `usePlayerActivity` (the
 * only thing the hook uses) and assert the conversion + the
 * bridge call shape. They do NOT render the hook in a component
 * tree — the hook's logic is the `useCallback` body, which is a
 * pure function of its inputs once `openPlayer` is mocked.
 */

import {renderHook} from '@testing-library/react-native';
import {secondsToMs, usePlayWithResume} from '../../../src/infrastructure/player';

const mockOpenPlayer = jest.fn().mockResolvedValue(true);


// V19 W9.3 - stable identity, matching the real hook's useCallback. An
// inline arrow would hand back a NEW function every render, which would
// recompute the app seam's useMemo and break every 'same identity across
// renders' assertion downstream for a reason that exists only in the mock.
const mockOpenWithResume = (opts: Record<string, unknown>) =>
  mockOpenPlayer(opts);

// The lib's real `usePlayerActivity` memoises on `[]`, so BOTH of its
// results are stable for the life of the component. A `jest.fn()` created
// INSIDE the factory returns a new function on every render, which
// recomputes the app seam's `useMemo` and breaks every "same identity
// across renders" assertion for a reason that exists only in the mock.
const mockGetLaunchParams = jest.fn(() => null);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual =
    jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    // V19 W9.3: the app's launch seam routes through `useOpenWithResume`,
    // which imports `usePlayerActivity` by RELATIVE path - so mocking the
    // package root does not reach it and the real native bridge would be
    // called instead. `usePlayWithResume` passes an EXPLICIT
    // `startPositionMs`, so this hook's own contract is unaffected by
    // resume lookup; the seam's contract is covered by
    // `useResumeAwarePlayerActivity.test.tsx`.
    useOpenWithResume: () => mockOpenWithResume,
    usePlayerActivity: () => ({
      openPlayer: mockOpenPlayer,
      getLaunchParams: mockGetLaunchParams,
    }),
  };
});

beforeEach(() => {
  mockOpenPlayer.mockClear();
});

describe('usePlayWithResume (V21 W7 P26)', () => {
  it('converts positionSec to startPositionMs in ms', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///music/song.mp3',
      title: 'Test Song',
      mediaType: 'audio',
      positionSec: 60,
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith({
      uri: 'file:///music/song.mp3',
      title: 'Test Song',
      type: 'audio',
      startPositionMs: 60_000,
      // V19 W9.3: the app launch seam adds `resumeId` (= the uri, the
      // app's resume key) to every launch. `startPositionMs` above is
      // still the value that will actually be used - an explicit
      // position outranks a saved one.
      resumeId: 'file:///music/song.mp3',
    });
  });

  it('omits startPositionMs when positionSec is 0 (start from beginning)', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///music/song.mp3',
      title: 'Test Song',
      mediaType: 'audio',
      positionSec: 0,
    });
    expect(mockOpenPlayer.mock.calls[0][0]).not.toHaveProperty(
      'startPositionMs',
    );
  });

  it('omits startPositionMs when positionSec is negative (defensive)', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///music/song.mp3',
      title: 'Test Song',
      mediaType: 'video',
      positionSec: -5,
    });
    expect(mockOpenPlayer.mock.calls[0][0]).not.toHaveProperty(
      'startPositionMs',
    );
  });

  it('rounds fractional seconds to the nearest ms', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///video/episode.mp4',
      title: 'Episode 1',
      mediaType: 'video',
      positionSec: 123.456,
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith({
      uri: 'file:///video/episode.mp4',
      title: 'Episode 1',
      type: 'video',
      startPositionMs: 123_456,
      resumeId: 'file:///video/episode.mp4',
    });
  });

  it('resolves mediaType via resolveStreamType (music → audio)', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///music/track.mp3',
      title: 'Track',
      mediaType: 'music',
      positionSec: 30,
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({type: 'audio'}),
    );
  });

  it('resolves mediaType via resolveStreamType (movie → video)', async () => {
    const {result} = await renderHook(() => usePlayWithResume());
    result.current!({
      uri: 'file:///movies/film.mp4',
      title: 'Film',
      mediaType: 'movie',
      positionSec: 0,
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({type: 'video'}),
    );
  });

  it('reuses the same callback identity across renders (useCallback)', async () => {
    const {result, rerender} = await renderHook(() => usePlayWithResume());
    const first = result.current;
    await rerender(undefined);
    expect(result.current).toBe(first);
  });

  it('returns ok(playbackId) when the bridge accepts', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlayWithResume());
    const r = await result.current!({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
      positionSec: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatch(/^resume:file:\/\/\/x:\d+$/);
  });

  it('returns err(networkError) when the bridge returns false', async () => {
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlayWithResume());
    const r = await result.current!({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
      positionSec: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('network');
      expect(r.error.message).toMatch(/refused/i);
    }
  });

  it('returns err(networkError) when the bridge throws', async () => {
    mockOpenPlayer.mockRejectedValueOnce(new Error('bridge down'));
    const {result} = await renderHook(() => usePlayWithResume());
    const r = await result.current!({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
      positionSec: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Narrow to NetworkStreamError to read `cause` (other
      // variants don't have a `cause` field).
      expect(r.error.kind).toBe('network');
      if (r.error.kind === 'network') {
        expect(r.error.cause).toBe('bridge down');
      }
    }
  });

  it('returns err(networkError) when the bridge throws a non-Error value', async () => {
    mockOpenPlayer.mockRejectedValueOnce('plain string');
    const {result} = await renderHook(() => usePlayWithResume());
    const r = await result.current!({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
      positionSec: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('network');
      if (r.error.kind === 'network') {
        expect(r.error.cause).toBe('plain string');
      }
    }
  });
});

describe('secondsToMs re-export (V21 W7 P26)', () => {
  // The facade re-exports `secondsToMs` so consumers can convert
  // positions without importing from the .ts file directly.
  // The actual conversion is unit-tested in position.test.ts; this
  // test guards the re-export itself.
  it('is the same function reference as the .ts file', () => {
    const fromPositionFile =
      jest.requireActual('../../../src/infrastructure/player/position').secondsToMs;
    expect(secondsToMs).toBe(fromPositionFile);
  });
});
