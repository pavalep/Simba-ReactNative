/**
 * V21 W22 D-023 — `usePlaybackFacade` hook tests.
 *
 * The facade composes 5 lower-level hooks (`usePlayer` +
 * `usePlayerProgress` + `usePlayerActivity` + `usePlay` +
 * `useOpenPlaylist`) into a single `PlaybackFacade` object
 * with 5 sub-surfaces: state / progress / commands / launch
 * / activity. These tests assert the composition is correct
 * (each sub-surface pulls from the right hook) and that the
 * launchers return `Result<PlaybackId, StreamError>`.
 *
 * The facade is a "view" hook — it doesn't own any new
 * behavior, it just re-shapes the 5 underlying contexts. The
 * 5 underlying contexts already have their own tests
 * (`usePlay.test.tsx` etc.), so the facade tests focus on
 * the composition + the type-level mapping (e.g.
 * `PlayerState.isMuted` → `PlaybackState.mute`,
 * `PlayerState.loopMode` → `PlaybackState.loop`).
 */

import {renderHook} from '@testing-library/react-native';
import {usePlaybackFacade} from '../../../src/infrastructure/player';

const mockOpenPlayer = jest.fn();
const mockGetLaunchParams = jest.fn<unknown, []>(() => null);
const mockOpenPlaylistRaw = jest.fn();

let mockState: Record<string, unknown> = {};
let mockProgress: Record<string, unknown> = {};
const mockCommands: Record<string, jest.Mock> = {
  play: jest.fn(),
  pause: jest.fn(),
  togglePlayPause: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  seek: jest.fn(),
};

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual =
    jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    usePlayer: () => ({state: mockState, commands: mockCommands}),
    usePlayerProgress: () => mockProgress,
    usePlayerActivity: () => ({
      openPlayer: mockOpenPlayer,
      getLaunchParams: mockGetLaunchParams,
    }),
    useOpenPlaylist: () => ({openPlaylist: mockOpenPlaylistRaw}),
  };
});

beforeEach(() => {
  mockState = {
    isPlaying: false,
    title: '',
    artist: '',
    album: '',
    positionMs: 0,
    durationMs: 0,
    isBuffering: false,
    isSeeking: false,
    seekable: false,
    volume: 100,
    isMuted: false,
    speed: 1,
    loopMode: 'none',
    playlist: [],
    currentIndex: -1,
    tracks: [],
    chapters: [],
    currentChapter: null,
    videoParams: null,
    error: null,
  };
  mockProgress = {
    positionMs: 0,
    durationMs: 0,
    isBuffering: false,
    isSeeking: false,
    seekable: false,
    cacheRanges: [],
    cacheFill: 0,
  };
  Object.values(mockCommands).forEach(fn => fn.mockClear());
  mockOpenPlayer.mockReset();
  mockOpenPlaylistRaw.mockReset();
  mockGetLaunchParams.mockReset();
  mockGetLaunchParams.mockReturnValue(null);
});

describe('usePlaybackFacade (V21 W22 D-023)', () => {
  it('returns the 5 sub-surfaces', async () => {
    const {result} = await renderHook(() => usePlaybackFacade());
    expect(result.current.state).toBeDefined();
    expect(result.current.progress).toBeDefined();
    expect(result.current.commands).toBeDefined();
    expect(result.current.launch).toBeDefined();
    expect(result.current.activity).toBeDefined();
  });

  it('state maps the underlying PlayerState fields', async () => {
    mockState = {
      ...mockState,
      isPlaying: true,
      title: 'Song A',
      volume: 80,
      isMuted: true,
      speed: 1.5,
      loopMode: 'file',
    };
    const {result} = await renderHook(() => usePlaybackFacade());
    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state.title).toBe('Song A');
    expect(result.current.state.volume).toBe(80);
    // The facade renames `isMuted` to `mute` for junior-dev
    // ergonomics — `mute` is shorter and matches the common
    // UI label.
    expect(result.current.state.mute).toBe(true);
    expect(result.current.state.speed).toBe(1.5);
    // The facade passes through the loopMode value space
    // unchanged ('none' | 'file' | 'playlist' — same as the
    // underlying module's MpvLoopMode).
    expect(result.current.state.loop).toBe('file');
  });

  it('progress passes through the underlying PlayerProgress fields', async () => {
    mockProgress = {
      ...mockProgress,
      positionMs: 12_345,
      durationMs: 180_000,
      isBuffering: true,
      isSeeking: true,
      seekable: true,
      cacheFill: 42,
    };
    const {result} = await renderHook(() => usePlaybackFacade());
    expect(result.current.progress.positionMs).toBe(12_345);
    expect(result.current.progress.durationMs).toBe(180_000);
    expect(result.current.progress.isBuffering).toBe(true);
    expect(result.current.progress.isSeeking).toBe(true);
    expect(result.current.progress.seekable).toBe(true);
    expect(result.current.progress.cacheFill).toBe(42);
  });

  it('commands pass through the underlying PlayerCommands', async () => {
    const {result} = await renderHook(() => usePlaybackFacade());
    result.current.commands.play();
    result.current.commands.pause();
    result.current.commands.togglePlayPause();
    result.current.commands.next();
    result.current.commands.previous();
    result.current.commands.seek(60_000);
    expect(mockCommands.play).toHaveBeenCalledTimes(1);
    expect(mockCommands.pause).toHaveBeenCalledTimes(1);
    expect(mockCommands.togglePlayPause).toHaveBeenCalledTimes(1);
    expect(mockCommands.next).toHaveBeenCalledTimes(1);
    expect(mockCommands.previous).toHaveBeenCalledTimes(1);
    expect(mockCommands.seek).toHaveBeenCalledWith(60_000);
  });

  it('launch.open() returns ok(playbackId) when the bridge accepts', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlaybackFacade());
    const r = await result.current.launch.open({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatch(/^play:file:\/\/\/x:\d+$/);
  });

  it('launch.open() returns err(networkError) when the bridge returns false', async () => {
    mockOpenPlayer.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlaybackFacade());
    const r = await result.current.launch.open({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
    });
    expect(r.ok).toBe(false);
  });

  it('launch.openWithResume() converts positionSec → startPositionMs', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlaybackFacade());
    await result.current.launch.openWithResume({
      uri: 'file:///music/song.mp3',
      title: 'Song',
      mediaType: 'audio',
      positionSec: 90,
    });
    expect(mockOpenPlayer).toHaveBeenCalledWith({
      uri: 'file:///music/song.mp3',
      title: 'Song',
      type: 'audio',
      startPositionMs: 90_000,
    });
  });

  it('launch.openWithResume() omits startPositionMs when positionSec is 0', async () => {
    mockOpenPlayer.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlaybackFacade());
    await result.current.launch.openWithResume({
      uri: 'file:///x',
      title: 'X',
      mediaType: 'audio',
      positionSec: 0,
    });
    expect(mockOpenPlayer.mock.calls[0][0]).not.toHaveProperty(
      'startPositionMs',
    );
  });

  it('launch.openPlaylist() calls useOpenPlaylist with the right shape', async () => {
    mockOpenPlaylistRaw.mockResolvedValueOnce(true);
    const {result} = await renderHook(() => usePlaybackFacade());
    const r = await result.current.launch.openPlaylist({
      entries: [
        {uri: 'file:///a', title: 'A'},
        {uri: 'file:///b', title: 'B'},
      ],
      mediaType: 'audio',
      startIndex: 1,
      startPositionSec: 30,
    });
    expect(r.ok).toBe(true);
    expect(mockOpenPlaylistRaw).toHaveBeenCalledWith(
      [
        {uri: 'file:///a', title: 'A'},
        {uri: 'file:///b', title: 'B'},
      ],
      {
        type: 'audio',
        startIndex: 1,
        shuffle: undefined,
        startPositionMs: 30_000,
      },
    );
  });

  it('launch.openPlaylist() returns err when the bridge returns false', async () => {
    mockOpenPlaylistRaw.mockResolvedValueOnce(false);
    const {result} = await renderHook(() => usePlaybackFacade());
    const r = await result.current.launch.openPlaylist({
      entries: [{uri: 'file:///a', title: 'A'}],
    });
    expect(r.ok).toBe(false);
  });

  it('activity.getLaunchParams proxies to usePlayerActivity', async () => {
    const params = {uri: 'file:///x', fileTitle: 'X'};
    mockGetLaunchParams.mockReturnValueOnce(params);
    const {result} = await renderHook(() => usePlaybackFacade());
    expect(result.current.activity.getLaunchParams()).toBe(params);
    expect(mockGetLaunchParams).toHaveBeenCalledTimes(1);
  });

  it('returns a stable facade object across renders (useMemo)', async () => {
    const {result, rerender} = await renderHook(() => usePlaybackFacade());
    const first = result.current;
    await rerender(undefined);
    expect(result.current).toBe(first);
  });
});
