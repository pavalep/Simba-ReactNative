/**
 * V21: the media lane is derived from the kind, never stored independently.
 *
 * ## The bug this pins
 *
 * A Turkish film was persisted as `{type: 'movie', mediaType: 'audio'}`
 * and appeared in Recently Played wearing a music badge — and played
 * through the audio pipeline. The badge bug and the routing bug were the
 * same defect.
 *
 * `MediaClassification` carries both `type` (a `MediaKind`) and
 * `mediaType` (a `MediaLane`), and the normalizer used to do
 * `input.mediaType ?? mediaKindToLane(type)` — so the lane WON over the
 * kind it was derived from. That made the normalizer a faithful preserver
 * of a bad value rather than a repair of one, and it is why fixing the
 * writer alone could never fix rows already on disk.
 *
 * `repairPersistedLanes` is the second half: rows already persisted are
 * read verbatim and nothing re-derives them, so the repair has to happen
 * in a `migrate` callback.
 */

import {
  normalizeMediaClassification,
  mediaKindToLane,
} from '../../src/types/media';
import {repairPersistedLanes} from '../../src/state/persistence';

describe('mediaKindToLane', () => {
  it.each([
    ['audio', 'audio'],
    ['music', 'audio'],
    ['podcast', 'audio'],
    ['audiobook', 'audio'],
    ['radio', 'audio'],
    ['archive-audio', 'audio'],
    ['video', 'video'],
    ['movie', 'video'],
    ['live-tv', 'video'],
    ['archive-video', 'video'],
  ] as const)('%s -> %s', (kind, lane) => {
    expect(mediaKindToLane(kind)).toBe(lane);
  });
});

describe('normalizeMediaClassification — the lane derives from the kind', () => {
  it('corrects a lane that disagrees with the kind', () => {
    // The regression. The old implementation returned 'audio' here.
    const result = normalizeMediaClassification({
      type: 'movie',
      mediaType: 'audio',
    });
    expect(result.mediaType).toBe('video');
    // The kind is the semantic truth and must survive untouched.
    expect(result.type).toBe('movie');
  });

  it('is idempotent for a row that already agrees', () => {
    const once = normalizeMediaClassification({type: 'movie', mediaType: 'video'});
    const twice = normalizeMediaClassification(once);
    expect(twice).toEqual(once);
  });

  it('derives the lane when only the kind is present', () => {
    expect(normalizeMediaClassification({type: 'podcast'}).mediaType).toBe('audio');
    expect(normalizeMediaClassification({type: 'live-tv'}).mediaType).toBe('video');
  });

  it('round-trips a lane-only record instead of flipping it', () => {
    // `type` is taken from `mediaType` when absent. Both are valid
    // MediaKind values and 'audio' IS an audio kind, so this must not
    // become 'video' — which it would if the derivation ignored the
    // lane-spelling fallbacks.
    expect(normalizeMediaClassification({mediaType: 'audio'}).mediaType).toBe(
      'audio',
    );
    expect(normalizeMediaClassification({mediaType: 'video'}).mediaType).toBe(
      'video',
    );
  });

  it('defaults an entirely unclassified record to video, once, not twice', () => {
    const result = normalizeMediaClassification({});
    expect(result).toMatchObject({type: 'video', mediaType: 'video', source: 'local'});
  });
});

describe('repairPersistedLanes — the migration for rows already on disk', () => {
  const persistedRow = {
    fileUri: 'file:///movies/namus-kanla.mkv',
    title: 'Namus Kanla',
    position: 17_000,
    duration: 6_120_000,
    lastPlayedAt: '2026-10-09T12:00:00.000Z',
    thumbnailPath: 'https://cdn/janus.jpg',
    type: 'movie',
    mediaType: 'audio',
    source: 'api',
  };

  it('repairs a mis-tagged row on disk', () => {
    const [repaired] = repairPersistedLanes([persistedRow]) ?? [];
    expect(repaired.mediaType).toBe('video');
  });

  it('preserves every other persisted field', () => {
    // A repair must not cost the user their history. Position, duration,
    // timestamps and artwork all have to survive.
    const [repaired] = repairPersistedLanes([persistedRow]) ?? [];
    expect(repaired).toMatchObject({
      fileUri: persistedRow.fileUri,
      title: persistedRow.title,
      position: persistedRow.position,
      duration: persistedRow.duration,
      lastPlayedAt: persistedRow.lastPlayedAt,
      thumbnailPath: persistedRow.thumbnailPath,
      source: 'api',
    });
  });

  it('leaves a correct row byte-identical and returns the same array', () => {
    const rows = [{...persistedRow, mediaType: 'video'}];
    expect(repairPersistedLanes(rows)).toBe(rows);
  });

  it('is idempotent — running it twice changes nothing the second time', () => {
    const once = repairPersistedLanes([persistedRow]);
    const twice = repairPersistedLanes(once);
    expect(twice).toBe(once);
  });

  it('handles non-array and empty input without throwing', () => {
    expect(repairPersistedLanes(undefined)).toBeUndefined();
    expect(repairPersistedLanes([])).toEqual([]);
  });
});