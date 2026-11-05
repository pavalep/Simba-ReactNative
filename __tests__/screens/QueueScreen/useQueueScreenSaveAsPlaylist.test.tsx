/**
 * The Queue screen's "save as playlist" — a playlist holds ONE lane.
 *
 * ## The defect this pins
 *
 * A playlist used to have a third kind that held BOTH lanes, so the queue
 * screen's "save as playlist" wrote one for a queue that crossed lanes:
 *
 * ```ts
 * const lanes = new Set(upNext.map(entry => entry.mediaType));
 * const kind = lanes.size > 1 ? 'MIXED' : …;
 * ```
 *
 * The mixed kind was removed on 2026-11-05 — a list that spans two lanes
 * is a QUEUE, not a playlist — so a cross-lane queue can no longer be
 * saved as one. The rule now has to be HONEST about it: the queue screen
 * says why, and nothing is dropped behind the user's back.
 *
 * A refusal that says nothing is the failure this file is here to stop: a
 * button that does nothing, with no reason on screen, is a control that
 * lies.
 *
 * ## What this pins
 *
 *  1. A single-lane queue IS saved, with the kind its items imply.
 *  2. A cross-lane queue is REFUSED — no playlist is written.
 *  3. The refusal carries the reason, so the screen can show it.
 *
 * The RULE itself (`playlistKindForItems`) is pinned in
 * `__tests__/features/playlists/playlistKindForItems.test.ts`. This file
 * pins that the queue screen USES it and honours it.
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

const mockImportPlaylist = jest.fn();

jest.mock('../../../src/features/playlists', () => {
  const actual = jest.requireActual('../../../src/features/playlists');
  return {
    ...actual,
    playlistActions: {
      ...actual.playlistActions,
      importPlaylist: (...args: unknown[]) => mockImportPlaylist(...args),
    },
  };
});

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
  }),
  useQueueItemsAs: () => [],
  usePlaybackHistoryAs: () => [],
}));

import {useQueueScreen} from '../../../src/screens/QueueScreen/hooks/useQueueScreen';
import {usePlayerStore} from '../../../src/state/playerStore';

const TRACK = {
  uri: 'file:///music/song.mp3',
  title: 'A Song',
  duration: 210,
  source: 'local' as const,
  type: 'music' as const,
  mediaType: 'audio' as const,
};

const ANOTHER_TRACK = {...TRACK, uri: 'file:///music/other.mp3', title: 'Another Song'};

const FILM = {
  uri: 'file:///video/film.mp4',
  title: 'A Film',
  duration: 5400,
  source: 'local' as const,
  type: 'movie' as const,
  mediaType: 'video' as const,
};

describe('the Queue screen — save as playlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.getState().reset();
  });

  it('saves a single-lane queue, with the kind its items imply', async () => {
    // The current track is index 0, so BOTH of these are "up next".
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER_TRACK]);

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.saveAsPlaylistBlockReason).toBeNull();
    expect(result.current.handleSaveAsPlaylist('Commute')).toBe(true);
    expect(mockImportPlaylist).toHaveBeenCalledTimes(1);
    expect(mockImportPlaylist.mock.calls[0][0]).toMatchObject({
      name: 'Commute',
      kind: 'AUDIO_ONLY',
    });
  });

  it('REFUSES a queue that crosses lanes, and writes nothing', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER_TRACK, FILM]);

    const {result} = await renderHook(() => useQueueScreen());

    expect(result.current.handleSaveAsPlaylist('Everything')).toBe(false);
    expect(mockImportPlaylist).not.toHaveBeenCalled();
  });

  it('says WHY it refused, so the screen can show the reason', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, ANOTHER_TRACK, FILM]);

    const {result} = await renderHook(() => useQueueScreen());

    const reason = result.current.saveAsPlaylistBlockReason;
    expect(reason).toBeTruthy();
    // The reason has to name BOTH sides, or it does not explain the block.
    expect(reason).toContain('audio');
    expect(reason).toContain('video');
    expect(reason).toContain('playlist');
  });
});
