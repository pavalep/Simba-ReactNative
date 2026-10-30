/**
 * The playlist model's two load-bearing rules.
 *
 * 1. A `MIXED` playlist is preserved WHOLE. The old store split a mixed
 *    record into an audio sibling and a video sibling on rehydrate, which
 *    silently destroyed the user's playlist - its name, its id and half its
 *    items - and told the user nothing.
 * 2. A single-lane playlist still refuses the other lane. `MIXED` is a
 *    third kind, not a loosening of the first two: it is bound by the same
 *    allow-list, so a radio station is refused by a mixed playlist exactly
 *    as it is by a single-lane one.
 */
import {normalizePersistedPlaylists} from '../../src/state/playlistsStore';

const audioItem = {
  id: 'pli_audio',
  fileUri: 'file:///track.mp3',
  title: 'A track',
  duration: 100,
  addedAt: '2026-01-01T00:00:00.000Z',
  source: 'api' as const,
  type: 'music' as const,
  mediaType: 'audio' as const,
};

const videoItem = {
  id: 'pli_video',
  fileUri: 'file:///film.mp4',
  title: 'A film',
  duration: 200,
  addedAt: '2026-01-01T00:00:00.000Z',
  source: 'api' as const,
  type: 'movie' as const,
  mediaType: 'video' as const,
};

describe('the playlist model', () => {
  describe('a MIXED playlist', () => {
    it('survives rehydrate WHOLE - not split, not filtered', () => {
      const playlists = normalizePersistedPlaylists([
        {
          id: 'pl_mixed',
          name: 'Road trip',
          kind: 'MIXED',
          items: [audioItem, videoItem],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

      expect(playlists).toHaveLength(1);
      const [playlist] = playlists;
      expect(playlist.id).toBe('pl_mixed');
      expect(playlist.name).toBe('Road trip');
      expect(playlist.kind).toBe('MIXED');
      expect(playlist.items.map(item => item.id)).toEqual(['pli_audio', 'pli_video']);
    });

    it('still refuses a kind the allow-list refuses', () => {
      const playlists = normalizePersistedPlaylists([
        {
          id: 'pl_mixed',
          name: 'Road trip',
          kind: 'MIXED',
          items: [
            audioItem,
            videoItem,
            {...audioItem, id: 'pli_radio', type: 'radio' as const},
          ],
        },
      ]);

      const [playlist] = playlists;
      expect(playlist.items.map(item => item.id)).toEqual(['pli_audio', 'pli_video']);
    });
  });

  describe('a single-lane playlist', () => {
    it('refuses an audio item in a VIDEO_ONLY playlist', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_video', name: 'Films', kind: 'VIDEO_ONLY', items: [audioItem, videoItem]},
      ]);

      const [playlist] = playlists;
      expect(playlist.items.map(item => item.id)).toEqual(['pli_video']);
    });

    it('refuses a video item in an AUDIO_ONLY playlist', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_audio', name: 'Music', kind: 'AUDIO_ONLY', items: [audioItem, videoItem]},
      ]);

      const [playlist] = playlists;
      expect(playlist.items.map(item => item.id)).toEqual(['pli_audio']);
    });
  });

  describe('pinned', () => {
    it('defaults to false for a playlist persisted before pinning existed', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_old', name: 'Old', kind: 'AUDIO_ONLY', items: [audioItem]},
      ]);

      const [playlist] = playlists;
      expect(playlist.pinned).toBe(false);
      expect(playlist.pinnedAt).toBeUndefined();
    });

    it('keeps the pin and when it was pinned', () => {
      const playlists = normalizePersistedPlaylists([
        {
          id: 'pl_pinned',
          name: 'Pinned',
          kind: 'AUDIO_ONLY',
          items: [audioItem],
          pinned: true,
          pinnedAt: '2026-05-05T00:00:00.000Z',
        },
      ]);

      const [playlist] = playlists;
      expect(playlist.pinned).toBe(true);
      expect(playlist.pinnedAt).toBe('2026-05-05T00:00:00.000Z');
    });
  });
});
