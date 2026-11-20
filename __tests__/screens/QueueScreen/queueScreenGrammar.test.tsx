/**
 * The Queue screen — the four queue behaviours (WAVE B16, Wave D).
 *
 * ## What this pins
 *
 *   - B15-Q8 — the EXPLICIT queue and the RUN are two lists with two
 *     origins. They were rendered as ONE "Up Next" list, so a user
 *     could not tell the tracks they had queued from the rest of the
 *     album they were listening to.
 *
 *   - B15-Q5 — the jump went straight to the bridge's `loadFile`,
 *     bypassing the launch seam. That is why the "Now Playing" row
 *     could go stale, why the resume position was never resolved, and
 *     why an AUDIO jump in the same lane never actually played (the
 *     bridge's `loadFile` loads into the mpv handle the VIDEO surface
 *     owns; audio plays through the media service).
 *
 *   - B15-Q2 — the library's `clearQueue` and `shuffleQueue` existed
 *     and NOTHING in the app called them.
 *
 * The mirror's own persistence is pinned in
 * `__tests__/infrastructure/player/queuePersistence.test.tsx` (B15-Q3).
 */

import {renderHook, act} from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: {from: 'mini'}}),
}));

jest.mock('../../../src/hooks/useHaptics', () => ({
  useHaptics: () => ({light: jest.fn(), medium: jest.fn(), heavy: jest.fn()}),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: jest.fn()}),
}));

const mockPlay = jest.fn();
const mockLoadFile = jest.fn();
const mockClearQueue = jest.fn();
const mockShuffleQueue = jest.fn();
const mockRemoveFromQueueByIndex = jest.fn();
const mockReorderQueue = jest.fn();
const mockRemoveFromQueue = jest.fn();
let mockQueue: unknown[] = [];

/**
 * The bridge escape hatch is MOCKED ON PURPOSE.
 *
 * The screen must not reach for it any more — but if it ever does, the
 * mock is here and the assertion "the bridge was never called" fails
 * instead of silently passing because the import had gone away.
 */
jest.mock('../../../src/infrastructure/player', () => ({
  getMpvPlayerModule: () => ({loadFile: mockLoadFile}),
  resolveStreamType: (kind: string) => kind,
  usePlay: () => mockPlay,
  usePlayer: () => ({state: {isPlaying: false}}),
  isNetworkError: () => false,
  isUnsupportedError: () => false,
  isExpiredError: () => false,
  isBlockedError: () => false,
  useQueue: () => ({
    addToQueue: jest.fn(),
    prependToQueue: jest.fn(),
    removeFromQueueByIndex: mockRemoveFromQueueByIndex,
    reorderQueue: mockReorderQueue,
    removeFromQueue: mockRemoveFromQueue,
    clearQueue: mockClearQueue,
    shuffleQueue: mockShuffleQueue,
  }),
  useQueueItemsAs: () => mockQueue,
  usePlaybackHistoryAs: () => [],
}));

import {
  useQueueScreen,
  withRowKeys,
} from '../../../src/screens/QueueScreen/hooks/useQueueScreen';
import {usePlayerStore} from '../../../src/state/playerStore';

const TRACK = {
  uri: 'file:///music/song.mp3',
  title: 'A Song',
  duration: 210,
  source: 'local' as const,
  type: 'music' as const,
  mediaType: 'audio' as const,
};

const ANOTHER = {
  ...TRACK,
  uri: 'file:///music/other.mp3',
  title: 'Another Song',
};

const QUEUED = {
  ...TRACK,
  uri: 'file:///music/queued.mp3',
  title: 'Queued Song',
};

const QUEUED_TWO = {
  ...TRACK,
  uri: 'file:///music/queued2.mp3',
  title: 'Queued Song Two',
};

describe('the Queue screen — the queue behaviours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue = [];
    mockPlay.mockResolvedValue({ok: true});
    usePlayerStore.getState().reset();
  });

  // ── B15-Q8 ──────────────────────────────────────────────────────

  it('keeps the explicit queue and the run\'s tail as TWO lists', async () => {
    mockQueue = [QUEUED];
    // The run is the album: index 0 is playing, index 1 is the tail.
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.queueRows.map(r => r.title)).toEqual(['Queued Song']);
    expect(result.current.runRows.map(r => r.title)).toEqual(['Another Song']);
  });

  it('lists them in the PLAYBACK order — the queue first, then the run', async () => {
    mockQueue = [QUEUED];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());

    // The transport's next button plays the queue's head before the
    // run's tail, so the list and the engine agree on the order.
    expect(result.current.upNext.map(r => r.title)).toEqual([
      'Queued Song',
      'Another Song',
    ]);
  });

  it('reports an empty queue and an empty run as empty, not as one list', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK]);

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.queueRows).toEqual([]);
    expect(result.current.runRows).toEqual([]);
    expect(result.current.upNext).toEqual([]);
  });

  // ── B15-Q5 ──────────────────────────────────────────────────────

  it('jumps THROUGH the launch seam, never through the bridge', async () => {
    mockQueue = [];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleJumpTo(ANOTHER, 'playlist', 0);
    });

    // The bypass. If the raw bridge call comes back, the session can go
    // stale again and an audio jump stops playing.
    expect(mockLoadFile).not.toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('launches WITHOUT taking over the window — the user is reading a queue', async () => {
    mockQueue = [];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleJumpTo(ANOTHER, 'playlist', 0);
    });

    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: ANOTHER.uri,
        title: ANOTHER.title,
        expand: false,
      }),
    );
  });

  it('carries the KIND and the LANE into the launch', async () => {
    mockQueue = [];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleJumpTo(ANOTHER, 'playlist', 0);
    });

    // Without the kind, the session records a bare 'audio' and a film
    // reaches "Recently Played" as a music note.
    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaKind: 'music',
        mediaLane: 'audio',
      }),
    );
  });

  it('moves the run to the row that was tapped', async () => {
    mockQueue = [];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleJumpTo(ANOTHER, 'playlist', 0);
    });

    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().currentFile?.uri).toBe(ANOTHER.uri);
  });

  it('takes the tapped track OUT of the queue — it is playing now', async () => {
    mockQueue = [QUEUED, QUEUED_TWO];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleJumpTo(QUEUED, 'queue', 0);
    });

    expect(mockRemoveFromQueueByIndex).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({uri: QUEUED.uri}),
    );
  });

  // ── B15-Q2 ──────────────────────────────────────────────────────

  it('clears the explicit queue', async () => {
    mockQueue = [QUEUED, QUEUED_TWO];

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleClearQueue();
    });

    expect(mockClearQueue).toHaveBeenCalledTimes(1);
  });

  it('shuffles the explicit queue', async () => {
    mockQueue = [QUEUED, QUEUED_TWO];

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleShuffleQueue();
    });

    expect(mockShuffleQueue).toHaveBeenCalledTimes(1);
  });

  it('will not offer a shuffle of a single track', async () => {
    mockQueue = [QUEUED];

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.canShuffleQueue).toBe(false);
  });

  it('offers a shuffle as soon as the queue holds two tracks', async () => {
    mockQueue = [QUEUED, QUEUED_TWO];

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.canShuffleQueue).toBe(true);
  });

  // ── The rows stay exact ─────────────────────────────────────────

  it('removes the run\'s row by the RUN\'s own index, not the section\'s', async () => {
    mockQueue = [];
    // The run holds three tracks; the first is playing, so the section
    // starts at the run's index 1.
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER, QUEUED]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleRemove('playlist', 1);
    });

    // Section index 1 is the run's index 2.
    expect(usePlayerStore.getState().playlist.map(e => e.uri)).toEqual([
      TRACK.uri,
      ANOTHER.uri,
    ]);
  });

  it('reorders inside the run\'s own indices', async () => {
    mockQueue = [];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER, QUEUED]);

    const {result} = await renderHook(() => useQueueScreen());
    await act(async () => {
      result.current.handleReorder('playlist', 0, 1);
    });

    // Section index 0 is the run's index 1; section index 1 is index 2.
    expect(usePlayerStore.getState().playlist.map(e => e.uri)).toEqual([
      TRACK.uri,
      QUEUED.uri,
      ANOTHER.uri,
    ]);
  });

  // ── The rows stay distinct ──────────────────────────────────────

  it('gives two copies of the SAME track two different keys', async () => {
    // The queue is a list of tracks, not a set: the same track can be
    // queued twice, and React needs a different key for each copy.
    // Found on the device — two copies of one track collided on one
    // key, and React said so.
    mockQueue = [QUEUED, QUEUED];
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK]);

    const {result} = await renderHook(() => useQueueScreen());

    const keys = withRowKeys(result.current.queueRows).map(row => row.rowKey);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });
});
