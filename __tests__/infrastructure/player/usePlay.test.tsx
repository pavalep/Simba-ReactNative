/**
 * V21 W7 P28 — `usePlay` hook tests.
 *
 * `usePlay` is the typed successor to `usePlayerActivity().openPlayer`.
 * The V12 bridge returns `Promise<boolean>` — `false` for any failure,
 * no error code, no retry hint. The W7 P28 wrapper turns that into
 * `Promise<Result<PlaybackId, StreamError>>` with the 4 typed
 * variants.
 *
 * Current mapping (V21 W7 P28, refined by the B-009 reaudit):
 *   - bridge returns `true`  → `ok(playbackId)`
 *   - bridge returns `false` → `err(launchError)` (the native player
 *     refused to start; NOT a network problem)
 *   - bridge throws          → `err(mapBridgeLaunchError(e))`, which
 *     maps the typed bridge code to the matching variant
 *
 * A `false` return deliberately does NOT map to `network`: the bridge
 * only resolves `false` when `startActivity` didn't come back OK, so
 * telling the user "No connection — this will open when you're online"
 * would be a message about a problem they cannot fix by toggling Wi-Fi.
 *
 * The W22 follow-up (after a native bridge update) will let the
 * wrapper map to `unsupported` / `expired` / `blocked` based on
 * HTTP status codes. These tests assert the V21 contract; the
 * W22 mapping will add new tests, not change these.
 */

import {renderHook} from '@testing-library/react-native';
import {usePlay} from '../../../src/infrastructure/player';

const mockOpenPlayer = jest.fn();

// V19 W9.3 - stable identity, matching the real hook's useCallback. An
// inline arrow would hand back a NEW function every render, which would
// recompute the app seam's useMemo and break every 'same identity across
// renders' assertion downstream for a reason that exists only in the mock.
const mockOpenWithResume = (opts: Record<string, unknown>) =>
  mockOpenPlayer(opts);

// The lib's real `usePlayerActivity` memoises on `[]`, so BOTH of its
// results are stable for the life of the component. A `jest.fn()` created
// INSIDE the factory returns a new function on every render, which
// recomputes the app seam's `useMemo` and breaks "same identity across
// renders" for a reason that exists only in the mock.
const mockGetLaunchParams = jest.fn(() => null);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual =
    jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    // V19 W9.3: the app's launch seam routes through `useOpenWithResume`.
    // That hook imports `usePlayerActivity` by RELATIVE path, so mocking
    // the package root does not reach it - it would call the real native
    // bridge and `mockOpenPlayer` would record 0 calls.
    //
    // These tests are about `usePlay` (seconds->ms conversion, stream-type
    // resolution, Result mapping), not about resume. So resume is routed
    // around explicitly and visibly, rather than being silently faked:
    // resumeId is forwarded untouched so nothing is misrepresented.
    // `useResumeAwarePlayerActivity.test.tsx` owns the resume contract.
    useOpenWithResume: () => mockOpenWithResume,
    usePlayerActivity: () => ({
      openPlayer: mockOpenPlayer,
      getLaunchParams: mockGetLaunchParams,
    }),
  };
});

beforeEach(() => {
  mockOpenPlayer.mockReset();
});

describe('usePlay (V21 W7 P28)', () => {
  it('returns ok(playbackId) when the bridge accepts', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///music/song.mp3',
      title: 'Song',
      mediaType: 'audio',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatch(/^play:file:\/\/\/music\/song\.mp3:\d+$/);
    }
  });

  it('returns err(launchError) when the bridge returns false', async () => {
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'video',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('launch');
      expect(r.error.message).toBe('Player refused launch');
      // Nothing the user can do about it — no "try again" affordance.
      expect(r.error.kind === 'launch' && r.error.userFixable).toBe(false);
    }
  });

  it('does NOT blame the network when the player refuses to launch', async () => {
    // A `network` kind here would drive the call site
    // (MoviesDataProvider) into a "No connection, this will open when
    // you're online" toast — advice that cannot fix a refused launch.
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'video',
    });
    expect(!r.ok && r.error.kind).not.toBe('network');
  });

  it('returns err(networkError) when the bridge throws', async () => {    mockOpenPlayer.mockRejectedValueOnce(new Error('bridge exploded'));
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
    });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'network') {
      expect(r.error.message).toBe('Player launch failed');
      expect(r.error.cause).toBe('bridge exploded');
    } else {
      fail(`expected network error, got: ${JSON.stringify(r)}`);
    }
  });

  it('passes mediaType through resolveStreamType (music → audio)', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlay());
    await result.current({
      uri: 'file:///music/track.mp3',
      title: 'Track',
      mediaType: 'music',
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({type: 'audio'}),
    );
  });

  it('passes mediaType through resolveStreamType (movie → video)', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlay());
    await result.current({
      uri: 'file:///movies/film.mp4',
      title: 'Film',
      mediaType: 'movie',
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({type: 'video'}),
    );
  });

  it('each call produces a unique playbackId (timestamp-based)', async () => {
    mockOpenPlayer.mockResolvedValue(true);
    const {result} = await renderHook(() => usePlay());
    const r1 = await result.current({uri: 'a', title: 'A', mediaType: 'audio'});
    // wait 2ms to ensure a different Date.now()
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2));
    const r2 = await result.current({uri: 'b', title: 'B', mediaType: 'audio'});
    if (r1.ok && r2.ok) {
      expect(r1.value).not.toBe(r2.value);
      expect(r1.value).toContain('a');
      expect(r2.value).toContain('b');
    } else {
      fail('expected both calls to succeed');
    }
  });

  it('reuses the same callback identity across renders (useCallback)', async () => {
    mockOpenPlayer.mockResolvedValue(true);
    const {result, rerender} = await renderHook(() => usePlay());
    const first = result.current;
    await rerender(undefined);
    expect(result.current).toBe(first);
  });
});
