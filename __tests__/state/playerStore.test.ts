/**
 * The run holds EVERY lane.
 *
 * ## Why this test exists
 *
 * The queue store narrowed every run to the lane of its FIRST entry, and
 * dropped anything added in another lane — silently. The user tapped
 * "add", nothing appeared, and nothing said why.
 *
 * The narrowing had a second, quieter consequence that the queue screen
 * made obvious: a cross-lane run's items were in the store and no
 * surface would list them, so the run looked like it had lost them.
 *
 * The lane rule still exists, and it lives where it belongs — the PLAYLIST
 * STORE refuses an item a playlist may not hold
 * (`isPlaylistMediaKindAllowed`). What crosses the boundary at runtime is
 * the handover's job, and the handover has ONE owner:
 * `useLaneHandover` in
 * `src/infrastructure/player/useResumeAwareLaunch.ts`.
 *
 * A test that cannot fail is a comment with a `.test.ts` extension, so
 * both assertions below were mutation-checked: putting the narrowing back
 * fails them.
 */

import {usePlayerStore} from '../../src/state/playerStore';

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

const ANOTHER_TRACK = {
  uri: 'file:///music/second.mp3',
  title: 'Second',
  type: 'music' as const,
  mediaType: 'audio' as const,
  duration: 240,
};

describe('the run holds every lane', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset();
  });

  it('keeps EVERY item of a cross-lane run — both lanes', () => {
    usePlayerStore
      .getState()
      .loadPlaylistToPlayer([TRACK, FILM, ANOTHER_TRACK]);

    const {playlist} = usePlayerStore.getState();

    expect(playlist).toHaveLength(3);
    expect(playlist.map(entry => entry.mediaType)).toEqual([
      'audio',
      'video',
      'audio',
    ]);
  });

  it('does not silently drop an item added in another lane', () => {
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK]);

    usePlayerStore.getState().addToPlaylist(FILM);

    const {playlist} = usePlayerStore.getState();

    expect(playlist).toHaveLength(2);
    expect(playlist[1]?.uri).toBe(FILM.uri);
    expect(playlist[1]?.mediaType).toBe('video');
  });

  it('still starts the run at its first item', () => {
    // The narrowing also set `currentIndex` and `currentFile` from the
    // first entry. Dropping the narrowing must not drop that.
    usePlayerStore.getState().loadPlaylistToPlayer([TRACK, FILM]);

    const {currentIndex, currentFile} = usePlayerStore.getState();

    expect(currentIndex).toBe(0);
    expect(currentFile?.uri).toBe(TRACK.uri);
  });
});
