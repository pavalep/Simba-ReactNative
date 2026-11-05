/**
 * The playlist model's two load-bearing rules.
 *
 * 1. A record persisted with the REMOVED mixed kind is SPLIT into its two
 *    halves on rehydrate: the audio items become one playlist and the video
 *    items become another, each carrying the name it was given plus its
 *    lane. Every item survives, and the name survives on both halves.
 * 2. A single-lane playlist still refuses the other lane, and the allow-list
 *    still refuses a radio station in either lane.
 *
 * ## The retraction
 *
 * This file used to assert the OPPOSITE of rule 1 - "A `MIXED` playlist is
 * preserved WHOLE. The old store split a mixed record into an audio sibling
 * and a video sibling on rehydrate, which silently destroyed the user's
 * playlist - its name, its id and half its items - and told the user
 * nothing."
 *
 * That claim was true while the mixed kind existed, and it was the reason
 * the kind was first-class. The kind was REMOVED on 2026-11-05, so the claim
 * was retracted in the same change that removed the kind - not left to rot in
 * a test name and a docblock. The split is back, deliberately and with the
 * name and the id kept, which is the difference between the two splits.
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
  describe('a record persisted with the removed mixed kind', () => {
    it('splits into its two halves, and every item survives', () => {
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

      expect(playlists).toHaveLength(2);

      const [audio, video] = playlists;
      expect(audio.kind).toBe('AUDIO_ONLY');
      expect(audio.items.map(item => item.id)).toEqual(['pli_audio']);
      expect(video.kind).toBe('VIDEO_ONLY');
      expect(video.items.map(item => item.id)).toEqual(['pli_video']);
    });

    it('keeps the name on both halves, and says which lane each one is', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_mixed', name: 'Road trip', kind: 'MIXED', items: [audioItem, videoItem]},
      ]);

      expect(playlists.map(playlist => playlist.name)).toEqual([
        'Road trip (Audio)',
        'Road trip (Video)',
      ]);
    });

    it('gives the two halves different ids', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_mixed', name: 'Road trip', kind: 'MIXED', items: [audioItem, videoItem]},
      ]);

      const ids = playlists.map(playlist => playlist.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('splits the SAME way on every read, so the ids do not move', () => {
      const record = {
        id: 'pl_mixed',
        name: 'Road trip',
        kind: 'MIXED',
        items: [audioItem, videoItem],
      };

      const first = normalizePersistedPlaylists([record]);
      const second = normalizePersistedPlaylists([record]);

      expect(second.map(playlist => playlist.id)).toEqual(first.map(playlist => playlist.id));
    });

    it('keeps the pin on both halves', () => {
      const playlists = normalizePersistedPlaylists([
        {
          id: 'pl_mixed',
          name: 'Road trip',
          kind: 'MIXED',
          items: [audioItem, videoItem],
          pinned: true,
          pinnedAt: '2026-05-05T00:00:00.000Z',
        },
      ]);

      expect(playlists.every(playlist => playlist.pinned)).toBe(true);
      expect(playlists.map(playlist => playlist.pinnedAt)).toEqual([
        '2026-05-05T00:00:00.000Z',
        '2026-05-05T00:00:00.000Z',
      ]);
    });

    it('folds into the one lane it actually holds, under its own name', () => {
      const playlists = normalizePersistedPlaylists([
        {id: 'pl_mixed', name: 'Road trip', kind: 'MIXED', items: [audioItem]},
      ]);

      expect(playlists).toHaveLength(1);
      expect(playlists[0].kind).toBe('AUDIO_ONLY');
      expect(playlists[0].name).toBe('Road trip');
      expect(playlists[0].items.map(item => item.id)).toEqual(['pli_audio']);
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

      const kept = playlists.flatMap(playlist => playlist.items.map(item => item.id));
      expect(kept).toEqual(['pli_audio', 'pli_video']);
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
