/**
 * B15-Q3 — the explicit queue survives a restart.
 *
 * ## The defect this pins
 *
 * The explicit queue lives in the library's in-memory zustand store, so
 * a restart emptied it: a queue the user spent ten minutes building was
 * gone with nothing said.
 *
 * ## Why the app keeps the durable copy
 *
 * The library depends on `zustand` and nothing else — it has no notion
 * of MMKV, AsyncStorage or any other device store, and adding one would
 * mean the LIBRARY choosing the app's storage. So the app keeps the
 * durable copy and the library keeps the live one.
 *
 * These tests pin the three things that make that a mirror rather than
 * a second owner:
 *
 *   1. the mirror is written from the live queue and read at boot;
 *   2. a LIVE queue is never overwritten by the mirror;
 *   3. `resumePosition` is not persisted — the launch seam owns resume,
 *      and a second resume rule is how a resume silently starts at 0:00.
 */

import {renderHook} from '@testing-library/react-native';
const {MMKV} = require('react-native-mmkv');

const mockAddToQueue = jest.fn();
let mockQueue: unknown[] = [];

jest.mock('@simba-dev/react-native-media-player', () => ({
  useQueue: () => ({addToQueue: mockAddToQueue}),
  useQueueItemsAs: () => mockQueue,
}));

import {
  MAX_PERSISTED_QUEUE_ITEMS,
  readPersistedQueue,
  useQueuePersistence,
  writePersistedQueue,
} from '../../../src/infrastructure/player/queuePersistence';

const TRACK = {
  uri: 'file:///music/song.mp3',
  title: 'A Song',
  duration: 210,
  source: 'local' as const,
  type: 'music' as const,
  mediaType: 'audio' as const,
  provider: 'jamendo',
};

const OTHER = {
  uri: 'file:///music/other.mp3',
  title: 'Another Song',
  duration: 180,
  source: 'api' as const,
  type: 'podcast' as const,
  mediaType: 'audio' as const,
};

describe('the queue mirror — what goes on disk', () => {
  beforeEach(() => {
    MMKV.__resetForTests();
    jest.clearAllMocks();
    mockQueue = [];
  });

  it('round-trips a queue', () => {
    writePersistedQueue([TRACK, OTHER]);

    expect(readPersistedQueue()).toEqual([TRACK, OTHER]);
  });

  it('returns an empty queue when nothing was ever written', () => {
    expect(readPersistedQueue()).toEqual([]);
  });

  it('drops a row with no uri — it has no identity', () => {
    writePersistedQueue([
      {...TRACK, uri: ''},
      TRACK,
    ] as never);

    const rows = readPersistedQueue();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.uri).toBe(TRACK.uri);
  });

  it('drops an unknown classification rather than carrying it', () => {
    writePersistedQueue([
      {...TRACK, source: 'telepathy', type: 'hologram'},
    ] as never);

    const row = readPersistedQueue()[0]!;
    expect(row.source).toBeUndefined();
    expect(row.type).toBeUndefined();
    // With no kind there is nothing to derive a lane from, so the lane
    // that was stored survives — it is a valid lane.
    expect(row.mediaType).toBe('audio');
  });

  it('derives the lane from the kind, so a row that disagrees heals', () => {
    // A film stored with the audio lane is exactly the defect the
    // app's own normaliser repairs: the lane is a function of the
    // kind, and a row that disagrees with itself is repaired.
    writePersistedQueue([
      {...TRACK, type: 'movie', mediaType: 'audio'},
    ] as never);

    expect(readPersistedQueue()[0]!.mediaType).toBe('video');
  });

  it('derives a missing lane from the kind', () => {
    writePersistedQueue([
      {...TRACK, mediaType: undefined},
    ] as never);

    expect(readPersistedQueue()[0]!.mediaType).toBe('audio');
  });

  it('does NOT persist a resume position — the seam owns resume', () => {
    writePersistedQueue([
      {...TRACK, resumePosition: 42},
    ] as never);

    expect(readPersistedQueue()[0]!).not.toHaveProperty('resumePosition');
  });

  it('keeps the HEAD of a queue that is over the cap', () => {
    const many = Array.from({length: MAX_PERSISTED_QUEUE_ITEMS + 5}, (_, i) => ({
      ...TRACK,
      uri: `file:///music/${i}.mp3`,
    }));

    writePersistedQueue(many);

    const rows = readPersistedQueue();
    expect(rows).toHaveLength(MAX_PERSISTED_QUEUE_ITEMS);
    // The head is what plays next, so the head is what is kept.
    expect(rows[0]!.uri).toBe('file:///music/0.mp3');
  });
});

describe('the queue mirror — the hook that owns it', () => {
  beforeEach(() => {
    MMKV.__resetForTests();
    jest.clearAllMocks();
    mockQueue = [];
  });

  it('hydrates an EMPTY live queue from the mirror', async () => {
    writePersistedQueue([TRACK, OTHER]);
    mockQueue = [];

    await renderHook(() => useQueuePersistence());

    expect(mockAddToQueue).toHaveBeenCalledTimes(2);
    expect(mockAddToQueue).toHaveBeenCalledWith(
      expect.objectContaining({uri: TRACK.uri}),
    );
  });

  it('never overwrites a LIVE queue with the mirror', async () => {
    writePersistedQueue([TRACK]);
    // Something already queued before the mirror could hydrate — the
    // live intent is the newer truth.
    mockQueue = [OTHER];

    await renderHook(() => useQueuePersistence());

    expect(mockAddToQueue).not.toHaveBeenCalled();
  });

  it('mirrors a change to the live queue', async () => {
    mockQueue = [];

    const {rerender} = await renderHook(() => useQueuePersistence());

    mockQueue = [TRACK];
    await rerender(undefined);

    expect(readPersistedQueue()).toEqual([TRACK]);
  });

  it('mirrors an EMPTYING of the live queue', async () => {
    mockQueue = [TRACK];

    const {rerender} = await renderHook(() => useQueuePersistence());

    mockQueue = [];
    await rerender(undefined);

    expect(readPersistedQueue()).toEqual([]);
  });
});
