/**
 * V21 W7 P28 — `usePlay` hook tests.
 *
 * `usePlay` is the typed successor to `usePlayerActivity().openPlayer`.
 * The V12 bridge returns `Promise<boolean>` — `false` for any failure,
 * no error code, no retry hint. The W7 P28 wrapper turns that into
 * `Promise<Result<PlaybackId, StreamError>>` with the 4 typed
 * variants.
 *
 * Current best-effort mapping (V21):
 *   - bridge returns `true`  → `ok(playbackId)`
 *   - bridge returns `false` → `err(networkError)`
 *   - bridge throws          → `err(networkError({cause}))`
 *
 * The W22 follow-up (after a native bridge update) will let the
 * wrapper map to `unsupported` / `expired` / `blocked` based on
 * HTTP status codes. These tests assert the V21 contract; the
 * W22 mapping will add new tests, not change these.
 */

import {renderHook} from '@testing-library/react-native';
import {usePlay} from '../../../src/infrastructure/player';

const mockOpenPlayer = jest.fn();

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual =
    jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    usePlayerActivity: () => ({
      openPlayer: mockOpenPlayer,
      getLaunchParams: jest.fn().mockReturnValue(null),
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

  it('returns err(networkError) when the bridge returns false', async () => {
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlay());
    const r = await result.current({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'video',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('network');
      expect(r.error.message).toBe('Player refused launch');
    }
  });

  it('returns err(networkError) when the bridge throws', async () => {
    mockOpenPlayer.mockRejectedValueOnce(new Error('bridge exploded'));
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
    await new Promise(resolve => setTimeout(resolve, 2));
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
