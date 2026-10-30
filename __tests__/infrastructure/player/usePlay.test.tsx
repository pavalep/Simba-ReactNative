/**
 * V21 W7 P28 — `usePlay` hook tests.
 *
 * `usePlay` is the typed successor to `useResumeAwareLaunch().openPlayer`.
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
    // `useResumeAwareLaunch.test.tsx` owns the resume contract.
    useOpenWithResume: () => mockOpenWithResume,
    usePlayerActivity: () => ({
      openPlayer: mockOpenPlayer,
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
    // AUDIO, deliberately. V21 F3 moved video off `openPlayer` entirely —
    // an in-window launch has no synchronous bridge call that can refuse, so
    // there is no `false` for the seam to observe. Audio still goes through
    // `openWithResume`, so the bridge-refusal contract is pinned where it
    // can still happen rather than being silently deleted.
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
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
    //
    // Audio rather than video, and not only for the F3 reason above: this
    // assertion is `expect(!r.ok && r.error.kind).not.toBe('network')`,
    // which SHORT-CIRCUITS to `false` whenever `r.ok` is true. Asserted
    // against a lane whose launches always succeed, it would pass for
    // having evaluated nothing at all.
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
    });
    expect(r.ok).toBe(false);
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

  it('resolves a VIDEO launch in-window without opening an Activity', async () => {
    // V21 F3. `openPlayer` used to be `startActivity(PlayerActivity)`; a
    // video launch must not reach it any more, because that second Activity
    // is what the whole collapse exists to remove — and a SurfaceView's
    // Surface belongs to its window, so video in another Activity also
    // makes an in-app mini player impossible.
    //
    // The lane is still derived and still reaches the session, which is
    // what `useInWindowVideoLaunch` reads to load. Asserting the ABSENCE of
    // the Activity call is the contract; the resolution being `true` means
    // "the app accepted this launch", not "pixels are on screen".
    mockOpenPlayer.mockResolvedValue(true);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///movies/film.mp4',
      title: 'Film',
      mediaType: 'movie',
    });
    expect(r.ok).toBe(true);
    expect(mockOpenPlayer).not.toHaveBeenCalled();
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
  // B-026 — the artwork the caller has in hand reaches the launch.
  //
  // The launch is the only route artwork takes into the history store
  // (session -> checkpoint -> history entry), and the search grid had no
  // way to supply one: `PlayInput` had no artwork field at all. This
  // pins the field AND the forwarding, so a caller cannot hand over
  // artwork that the facade then drops.
  it('forwards the caller’s artwork to the launch', async () => {
    mockOpenPlayer.mockResolvedValue(true);
    const {result} = await renderHook(() => usePlay());

    await result.current({
      uri: 'file:///music/track.mp3',
      title: 'Track',
      mediaType: 'audio',
      thumbnailPath: 'https://cdn.example.test/cover.jpg',
    });

    // The seam renames the app's `thumbnailPath` to the bridge's
    // `artworkPath` on the way out, so `artworkPath` is what this mock
    // sees. It is the SAME value the caller handed over, which is the
    // point: the facade must not drop it.
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        artworkPath: 'https://cdn.example.test/cover.jpg',
      }),
    );
  });

  it('sends no artwork key at all when the caller has none', async () => {
    // The ~34 launch call sites that pass no artwork must not grow a
    // blank field: a present-but-empty path reads as artwork to the
    // seam.
    mockOpenPlayer.mockResolvedValue(true);
    const {result} = await renderHook(() => usePlay());

    await result.current({
      uri: 'file:///music/track.mp3',
      title: 'Track',
      mediaType: 'audio',
    });

    expect(mockOpenPlayer.mock.calls[0]![0]).not.toHaveProperty(
      'artworkPath',
    );
  });
});
