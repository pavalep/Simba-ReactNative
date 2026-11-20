/**
 * The Queue screen's "Previously Played" — the APP'S history.
 *
 * ## The defect this pins
 *
 * The section read the lib's `playbackHistory` — a store whose
 * `addToPlaybackHistory` is called from NOTHING, in the app or in the lib.
 * The lib's own unit tests are its only writer. So the Queue screen
 * promised "Previously Played" and never showed a row: the section was
 * permanently empty.
 *
 * The app's own `recentHistoryStore` is the real history — the checkpoint
 * writer upserts into it on every playback checkpoint.
 *
 * ## What is asserted
 *
 *  1. the section lists the app's recent history, newest first;
 *  2. each row carries the item's classification (so the badges are
 *     right) and its duration in SECONDS;
 *  3. the lib's never-written store is not consulted at all.
 */

import {renderHook} from '@testing-library/react-native';

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

/**
 * The lib's queue surface, with the playback-history read REMOVED on
 * purpose: if the screen ever reaches for it again, the import is
 * `undefined` and the suite fails on that — not on a quietly empty
 * section.
 */
jest.mock('../../../src/infrastructure/player', () => ({
  getMpvPlayerModule: () => ({loadFile: jest.fn()}),
  resolveStreamType: (kind: string) => kind,
  usePlay: () => jest.fn(),
  usePlayer: () => ({state: {isPlaying: false}}),
  isNetworkError: () => false,
  isUnsupportedError: () => false,
  isExpiredError: () => false,
  isBlockedError: () => false,
  useQueue: () => ({
    addToQueue: jest.fn(),
    prependToQueue: jest.fn(),
    removeFromQueueByIndex: jest.fn(),
    reorderQueue: jest.fn(),
    removeFromQueue: jest.fn(),
    // WAVE B16 (Wave D) — the queue's own actions (B15-Q2).
    clearQueue: jest.fn(),
    shuffleQueue: jest.fn(),
  }),
  useQueueItemsAs: () => [],
}));

import {useQueueScreen} from '../../../src/screens/QueueScreen/hooks/useQueueScreen';
import {usePlayerStore} from '../../../src/state/playerStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';

describe('the Queue screen — "Previously Played"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.getState().reset();
    useRecentHistoryStore.getState().reset();
  });

  it('lists the app\'s recent history, newest first', async () => {
    useRecentHistoryStore.getState().upsertRecentHistoryEntry({
      fileUri: 'file:///music/older.mp3',
      title: 'Older',
      position: 30,
      duration: 210,
      mediaType: 'audio',
      type: 'music',
      source: 'local',
    });
    useRecentHistoryStore.getState().upsertRecentHistoryEntry({
      fileUri: 'file:///music/newer.mp3',
      title: 'Newer',
      position: 10,
      duration: 180,
      mediaType: 'audio',
      type: 'music',
      source: 'local',
    });

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.history.map(e => e.title)).toEqual(['Newer', 'Older']);
  });

  it('carries the item\'s classification and its duration in SECONDS', async () => {
    useRecentHistoryStore.getState().upsertRecentHistoryEntry({
      fileUri: 'https://cdn.test/film.mkv',
      title: 'A Film',
      position: 60,
      duration: 5400,
      mediaType: 'video',
      type: 'movie',
      source: 'api',
      provider: 'internetArchive',
    });

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.history[0]).toMatchObject({
      uri: 'https://cdn.test/film.mkv',
      title: 'A Film',
      duration: 5400,
      mediaType: 'video',
      type: 'movie',
      source: 'api',
      provider: 'internetArchive',
    });
  });

  it('is empty when nothing has been played — and it says so honestly', async () => {
    const {result} = await renderHook(() => useQueueScreen());
    expect(result.current.history).toEqual([]);
    // With no current track and no queue, the screen has nothing at all.
    expect(result.current.hasContent).toBe(false);
  });
});
