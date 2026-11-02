/// <reference types="node" />
/**
 * B-046 — the transport advances the app's RUN.
 *
 * ## The defect
 *
 * `useTransport`'s `next` / `previous` called the lib's
 * `commands.next()` / `commands.previous()`, which advance **mpv's**
 * playlist. mpv's playlist holds exactly ONE entry in this app —
 * `loadfile` REPLACES it — and the app never calls
 * `commands.loadPlaylist`. So both were permanent no-ops: the next and
 * previous controls looked like controls, were clickable, and did
 * nothing at all.
 *
 * The same empty playlist produced four permanently-empty facts:
 *
 *   - `canGoNext` / `canGoPrev` were always `false`, so the next and
 *     previous controls were greyed out for every playlist and album
 *     launch;
 *   - `currentUri` was always `null`, so the More sheet's Save /
 *     Add-to-playlist / Share rows all answered "Nothing to …";
 *   - `nextTrack` was always `null`, so the NextUp overlay could only
 *     ever say "Next item".
 *
 * ## What these tests pin
 *
 * The app's RUN is `usePlayerStore.playlist`, and the rule for "what
 * plays next" is `runNeighbours` — the SAME rule the queue screen
 * already uses for its "Up Next" list (`playlist[currentIndex + 1 …]`).
 * The transport reads the run, and the MOVE goes through the lane
 * handover's one owner (`useLaneHandover`).
 *
 * Every "must not" below was mutation-checked: the test has to fail
 * when the fix is reverted.
 */

import {renderHook, act} from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────

const mockProgress = {
  positionMs: 0,
  durationMs: 0,
  isBuffering: false,
  isSeeking: false,
  seekable: true,
  cacheFill: 0,
  cacheRanges: [] as Array<{start: number; end: number}>,
};

const mockCommands = {
  seek: jest.fn(),
  seekBy: jest.fn(),
  togglePlayPause: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  setSpeed: jest.fn(),
  setVolume: jest.fn(),
  setScreenBrightness: jest.fn(),
  getScreenBrightness: jest.fn(() => 0.75),
  setProperty: jest.fn(),
  setLoopMode: jest.fn(),
  setTrack: jest.fn(),
  selectTrack: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  setAudioFilter: jest.fn(),
  setVideoFilter: jest.fn(),
  setShuffle: jest.fn(),
  setOrientation: jest.fn(),
  exitPipAndFinish: jest.fn(),
  stopPlayback: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
  setMuted: jest.fn(),
};

/**
 * The lib's own player state.
 *
 * `playlist: []` and `currentIndex: -1` are not incidental — they are
 * the truth about this app. mpv's playlist holds one entry (loadfile
 * replaces it) and the lib's queue store is never filled, so these are
 * what the lib reports for EVERY launch. A test that asserted
 * "canGoNext is true" without pinning them could still pass against an
 * implementation reading a populated playlist.
 */
const mockPlayerState = {
  isPlaying: true,
  shuffle: false,
  playlist: [] as Array<{filename?: string; title?: string}>,
  currentIndex: -1,
};

/**
 * The lib's resume-aware open. The transport's handover reaches it
 * through the launch seam, so it has to exist for the handover to run
 * at all — and it is the proof that the MOVE went through the app's
 * seam rather than through mpv.
 */
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayerProgress: () => mockProgress,
  usePlayer: () => ({commands: mockCommands, state: mockPlayerState}),
  useOpenWithResume: () => mockOpenWithResume,
  // The real one maps a kind or a lane onto 'audio' | 'video'.
  resolveStreamType: (mediaType?: string) =>
    mediaType === 'video' ? 'video' : 'audio',
}));

jest.mock('../../../src/state/useSkipPrevThresholdStore', () => ({
  getSkipPrevThresholdMs: () => 3000,
}));

import {useTransport} from '../../../src/infrastructure/player/useTransport';
import {usePlayerStore} from '../../../src/state/playerStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const TRACK_A = {
  uri: 'file:///music/a.mp3',
  title: 'Track A',
  type: 'music' as const,
  mediaType: 'audio' as const,
  duration: 201,
};

const TRACK_B = {
  uri: 'file:///music/b.mp3',
  title: 'Track B',
  type: 'music' as const,
  mediaType: 'audio' as const,
  duration: 202,
};

const FILM = {
  uri: 'file:///movies/namus-kanla-yazilir.mkv',
  title: 'Namus Kanla Yazilir',
  type: 'movie' as const,
  mediaType: 'video' as const,
  duration: 5760,
};

describe('useTransport — the transport advances the app RUN (B-046)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProgress.positionMs = 0;
    mockProgress.durationMs = 0;
    mockProgress.isBuffering = false;
    mockProgress.isSeeking = false;
    mockProgress.seekable = true;
    mockProgress.cacheFill = 0;
    mockProgress.cacheRanges = [];
    usePlayerStore.getState().reset();
    useNowPlayingStore.getState().reset();
  });

  it('enables the next control from the RUN, not from mpv playlist', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);

    const {result} = await renderHook(() => useTransport());

    // The lib's playlist is EMPTY in this app. If the control read it,
    // it could never be enabled — which is exactly the defect.
    expect(mockPlayerState.playlist).toEqual([]);
    expect(mockPlayerState.currentIndex).toBe(-1);

    expect(result.current.state.canGoNext).toBe(true);
    expect(result.current.state.canGoPrev).toBe(false);
  });

  it('disables the next control at the end of the run', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);
    usePlayerStore.getState().playFromPlaylist(1);

    const {result} = await renderHook(() => useTransport());

    expect(result.current.state.canGoNext).toBe(false);
    expect(result.current.state.canGoPrev).toBe(true);
  });

  it('advances the RUN when next() is pressed — and never asks mpv', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);

    const {result} = await renderHook(() => useTransport());

    await act(async () => {
      result.current.commands.next();
    });

    // The run moved.
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    // The session took the next entry.
    expect(useNowPlayingStore.getState().current?.uri).toBe(TRACK_B.uri);
    expect(useNowPlayingStore.getState().current?.title).toBe(TRACK_B.title);
    // And mpv's playlist was NOT advanced: it holds one entry, so that
    // call could only ever have been a no-op.
    expect(mockCommands.next).not.toHaveBeenCalled();
  });

  it('retreats the RUN when previous() is pressed — and never asks mpv', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);
    usePlayerStore.getState().playFromPlaylist(1);

    const {result} = await renderHook(() => useTransport());

    await act(async () => {
      result.current.commands.previous();
    });

    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(useNowPlayingStore.getState().current?.uri).toBe(TRACK_A.uri);
    expect(mockCommands.previous).not.toHaveBeenCalled();
  });

  it('crosses the lane boundary when next() is pressed', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, FILM]);

    const {result} = await renderHook(() => useTransport());

    await act(async () => {
      result.current.commands.next();
    });

    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('video');
    expect(useNowPlayingStore.getState().current?.type).toBe('movie');
  });

  it('skipPrev() restarts the item when the playhead is past the threshold', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);
    usePlayerStore.getState().playFromPlaylist(1);
    // Past the 3000 ms threshold — the Apple Music / Spotify rule.
    mockProgress.positionMs = 10_000;

    const {result} = await renderHook(() => useTransport());

    await act(async () => {
      result.current.commands.skipPrev();
    });

    expect(mockCommands.seek).toHaveBeenCalledWith(0);
    // The run did NOT move: "previous" here means "restart this item".
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(mockCommands.previous).not.toHaveBeenCalled();
  });

  it('skipPrev() goes back to the previous item when the playhead is within the threshold', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, TRACK_B]);
    usePlayerStore.getState().playFromPlaylist(1);
    mockProgress.positionMs = 1000;

    const {result} = await renderHook(() => useTransport());

    await act(async () => {
      result.current.commands.skipPrev();
    });

    expect(mockCommands.seek).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(useNowPlayingStore.getState().current?.uri).toBe(TRACK_A.uri);
  });

  it('reads the current URI from the SESSION, so a single-track launch still has an identity', async () => {
    // No run at all — this is what a single-track launch looks like.
    useNowPlayingStore.getState().begin({
      uri: TRACK_A.uri,
      title: TRACK_A.title,
      startPositionMs: 0,
      streamType: 'audio',
    });

    const {result} = await renderHook(() => useTransport());

    expect(result.current.state.currentUri).toBe(TRACK_A.uri);
    // And there is nothing to advance to, because the run is empty.
    expect(result.current.state.canGoNext).toBe(false);
    expect(result.current.state.nextTrack).toBeNull();
  });

  it('names the run next entry in nextTrack', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK_A, FILM]);

    const {result} = await renderHook(() => useTransport());

    expect(result.current.state.nextTrack).toEqual({
      uri: FILM.uri,
      title: FILM.title,
    });
  });
});
