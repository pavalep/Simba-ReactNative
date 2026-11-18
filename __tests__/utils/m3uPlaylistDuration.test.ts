/// <reference types="node" />
/**
 * The playlist M3U round trip, and the ONE duration unit.
 *
 * `PlaylistItem.duration` is SECONDS. That is now declared on the type
 * (`src/types/playlist.ts`), and this suite is what keeps it that way:
 * the M3U importer, the M3U exporter and the playlist row formatter
 * each had their own idea of the unit, and the disagreement was
 * invisible — a five-minute track exported as `#EXTINF:0`, re-imported
 * as a zero-length item, and shown in every playlist row as "0:00".
 *
 * `#EXTINF`'s duration is in seconds by the M3U format's own
 * definition, and `parseM3u` already read it that way — so the two
 * ends of the round trip now agree with the app's unit instead of
 * with each other's accident.
 */

import {generateM3u, parseM3u} from '../../src/utils/m3uParser';
import type {PlaylistItem} from '../../src/types/playlist';

const item = (overrides: Partial<PlaylistItem> = {}): PlaylistItem => ({
  id: 'p1',
  fileUri: 'file:///music/track.mp3',
  title: 'Track',
  duration: 300,
  addedAt: '2026-01-01T00:00:00.000Z',
  source: 'local',
  type: 'music',
  mediaType: 'audio',
  ...overrides,
});

describe('playlist M3U — the duration unit is seconds, both ways', () => {
  it('writes #EXTINF in SECONDS', () => {
    const m3u = generateM3u([item({duration: 300})]);
    expect(m3u).toContain('#EXTINF:300,');
    // The old formatter divided by 1000, so a five-minute track was
    // written as "#EXTINF:0" — a zero-length track to anything that
    // read it back.
    expect(m3u).not.toContain('#EXTINF:0,');
  });

  it('round-trips the duration unchanged', () => {
    const original = item({duration: 312});
    const parsed = parseM3u(generateM3u([original]));
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].duration).toBe(312);
  });

  it('reads #EXTINF as seconds, the format’s own unit', () => {
    const parsed = parseM3u(
      ['#EXTM3U', '#EXTINF:5760,Big Buck Bunny', 'file:///video/bbb.mkv'].join(
        '\n',
      ),
    );
    expect(parsed.entries[0].duration).toBe(5760);
  });

  it('keeps the title and the artist on the round trip', () => {
    const parsed = parseM3u(
      generateM3u([
        item({title: 'Second Song', artist: 'The Band', duration: 200}),
      ]),
    );
    expect(parsed.entries[0].title).toBe('Second Song');
    expect(parsed.entries[0].artist).toBe('The Band');
  });
});
