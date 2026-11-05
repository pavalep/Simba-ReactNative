/**
 * The lane handover — ONE owner.
 *
 * ## Why this test exists
 *
 * A run may cross lanes: the user plays an album, then adds a film to the
 * queue, and the run plays them in order. When the run crosses, the lane
 * changes mid-playback.
 *
 * That rule used to live in three places at once — the queue store
 * (narrowed the run), the queue screen (filtered it) and
 * `validateLane` (refused a cross-lane launch, and was called by nobody).
 * A rule that lives in three places is three chances to get it wrong.
 *
 * These assertions pin the ONE owner:
 *
 *  1. the run hands over from item N to item N+1 across the lane
 *     boundary — and the session takes the NEW lane;
 *  2. the handover does NOT remount the picture: a video handover does
 *     not ask the bridge for a new player, because the video lane is
 *     already mounted in the tree and the session tells it what to load.
 *
 * Both were mutation-checked.
 */

import {renderHook} from '@testing-library/react-native';

// `mock`-prefixed so babel's jest hoist lifts it above the factory.
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

jest.mock('@simba-dev/react-native-media-player', () => ({
  useOpenWithResume: () => mockOpenWithResume,
  // The real one maps a kind or a lane onto 'audio' | 'video'. Modelled
  // here so a mutation that stops resolving the lane fails on the
  // assertion, not on a TypeError.
  resolveStreamType: (mediaType: string) =>
    mediaType === 'video' ? 'video' : 'audio',
}));

import {useLaneHandover} from '../../../src/infrastructure/player/useResumeAwareLaunch';
import {usePlayerStore} from '../../../src/state/playerStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

const TRACK = {
  uri: 'file:///music/pale-matter.mp3',
  title: 'Pale Matter',
  type: 'music' as const,
  mediaType: 'audio' as const,
  duration: 201,
};

const FILM = {
  uri: 'file:///movies/namus-kanla-yazilir.mkv',
  title: 'Namus Kanla Yazilir',
  type: 'movie' as const,
  mediaType: 'video' as const,
  duration: 5760,
};

describe('useLaneHandover — the handover has ONE owner', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    usePlayerStore.getState().reset();
    useNowPlayingStore.getState().reset();
  });

  it('hands over from the audio item to the video item', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);

    const {result} = await renderHook(() => useLaneHandover());

    // The next item in the run is across the lane boundary.
    expect(result.current.next()?.uri).toBe(FILM.uri);
    expect(result.current.lane()).toBe('audio');

    const handed = await result.current.advance();

    expect(handed).toBe(true);
    // The run moved.
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    // The session took the NEW lane.
    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('video');
    expect(useNowPlayingStore.getState().current?.uri).toBe(FILM.uri);
  });

  it('does not remount the picture — a video handover does not ask the bridge for a new player', async () => {
    // The video lane is already mounted in the tree; the session tells it
    // what to load. Asking the bridge for a new player would create a
    // SECOND surface and tear the first one down — which is exactly the
    // remount the boundary rule forbids.
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);

    const {result} = await renderHook(() => useLaneHandover());
    await result.current.advance();

    // The handover DID happen. Without this, the assertion below would
    // pass for the wrong reason: a run that had been narrowed to one
    // lane holds no video item, so there is nothing to hand over to and
    // the bridge is never asked. A test that passes because the thing it
    // is about did not happen is not a test.
    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('video');

    expect(mockOpenWithResume).not.toHaveBeenCalled();
  });

  it('moves the presentation with the lane', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);

    // The video lane starts in the dock. Set it explicitly rather than
    // asserting the default: the presentation store is persisted, so an
    // earlier test in this file may already have expanded it — and a
    // precondition that depends on the order of the file is not a
    // precondition.
    usePresentationStore.getState().setVideoPresentation('mini');
    expect(usePresentationStore.getState().videoPresentation).toBe('mini');

    const {result} = await renderHook(() => useLaneHandover());
    await result.current.advance();

    expect(usePresentationStore.getState().videoPresentation).toBe('expanded');
  });

  it('reports that the run has ended', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK]);

    const {result} = await renderHook(() => useLaneHandover());

    expect(result.current.next()).toBeNull();
    expect(await result.current.advance()).toBe(false);
  });

  it('does not hand over when nothing is playing', async () => {
    const {result} = await renderHook(() => useLaneHandover());

    expect(result.current.next()).toBeNull();
    expect(await result.current.advance()).toBe(false);
  });
});

/**
 * The BACKWARD move — the same owner, the other direction.
 *
 * `previous` / `retreat` are the siblings of `next` / `advance`. They
 * exist because the transport's previous control and its smart-prev
 * (Apple Music / Spotify) both have to move the app's RUN backwards —
 * and mpv's playlist holds exactly one entry in this app, so
 * `commands.previous()` was a permanent no-op there too.
 */
describe('useLaneHandover — the backward move', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    usePlayerStore.getState().reset();
    useNowPlayingStore.getState().reset();
  });

  it('retreats to the entry before the current one', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);
    usePlayerStore.getState().playFromPlaylist(1);

    const {result} = await renderHook(() => useLaneHandover());

    expect(result.current.previous()?.uri).toBe(TRACK.uri);

    const handed = await result.current.retreat();

    expect(handed).toBe(true);
    // The run moved back.
    expect(usePlayerStore.getState().currentIndex).toBe(0);
    // And the session took the entry it moved to.
    expect(useNowPlayingStore.getState().current?.uri).toBe(TRACK.uri);
    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('audio');
  });

  it('reports that there is nothing before the first entry', async () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);

    const {result} = await renderHook(() => useLaneHandover());

    expect(result.current.previous()).toBeNull();
    expect(await result.current.retreat()).toBe(false);
    // The run did not move.
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it('does not retreat when nothing is playing', async () => {
    const {result} = await renderHook(() => useLaneHandover());

    expect(result.current.previous()).toBeNull();
    expect(await result.current.retreat()).toBe(false);
  });
});
