/**
 * W9.4 — the shared media vocabulary.
 *
 * These are the rules the resume READER, the checkpoint WRITER, the
 * history store and the bookmark store all depend on. They are pure
 * functions precisely so they can be tested without React, without
 * mocking the emitter, and without a device — the defect class this
 * codebase keeps hitting is a rule that only one side of a joined
 * chain implements.
 *
 * The edge cases below are the ones the user raised directly, plus the
 * ones that follow from them.
 */

import {
  CHECKPOINT_INTERVAL_MS,
  MIN_CHECKPOINT_POSITION_SEC,
  RESUME_MAX_FRACTION,
  isEffectivelyFinished,
  mediaKey,
  normalizeMediaUri,
  shouldRecordCheckpoint,
} from '../../../src/infrastructure/player/playbackProgress';

describe('normalizeMediaUri', () => {
  it('folds a bare absolute path onto the file:// spelling', () => {
    // React Native accepts both for the same file. On a raw compare the
    // player writes `file:///a/b.mkv` and a file-picker launch carries
    // `/a/b.mkv`, so the same film lands in "Recently Played" twice.
    expect(normalizeMediaUri('/storage/emulated/0/a/b.mkv')).toBe(
      'file:///storage/emulated/0/a/b.mkv',
    );
  });

  it('is idempotent', () => {
    // A normalisation that is not idempotent would re-write the key on
    // every pass, and a store that rewrites its own identity on save is
    // indistinguishable from one that duplicates rows.
    const once = normalizeMediaUri('/a/b.mkv');
    expect(normalizeMediaUri(once)).toBe(once);
  });

  it('drops the fragment', () => {
    expect(normalizeMediaUri('file:///a/b.mkv#t=30')).toBe(
      'file:///a/b.mkv',
    );
  });

  it('decodes percent-encoding so two spellings of one name agree', () => {
    expect(normalizeMediaUri('file:///a/My%20Film.mkv')).toBe(
      'file:///a/My Film.mkv',
    );
  });

  it('survives a literal percent that is not a valid escape', () => {
    // A file genuinely named `100%.mp3` must not throw or be mangled.
    expect(() => normalizeMediaUri('file:///a/100%.mp3')).not.toThrow();
    expect(normalizeMediaUri('file:///a/100%.mp3')).toContain('100%');
  });

  it('drops a trailing slash but keeps the scheme', () => {
    expect(normalizeMediaUri('file:///a/b/')).toBe('file:///a/b');
  });

  it('does NOT collapse a query string', () => {
    // `?quality=low` is a different resource. Merging it would make two
    // genuinely different streams one shelf entry.
    expect(normalizeMediaUri('https://h/v.mp4?q=low')).not.toBe(
      'https://h/v.mp4',
    );
  });

  it('returns empty for an empty uri', () => {
    expect(normalizeMediaUri('   ')).toBe('');
  });
});

describe('mediaKey', () => {
  it('gives one key for two spellings of the same file', () => {
    expect(mediaKey('/a/b.mkv')).toBe(mediaKey('file:///a/b.mkv'));
  });

  it('keeps genuinely different files apart', () => {
    // The remake case: two files with the same title are two items and
    // must not merge. Matching by title would be the bug here, not the
    // fix.
    expect(mediaKey('file:///a/Thing 1982.mkv')).not.toBe(
      mediaKey('file:///b/Thing 2011.mkv'),
    );
  });
});

describe('isEffectivelyFinished', () => {
  it('treats the last 10% as finished', () => {
    expect(isEffectivelyFinished(95, 100)).toBe(true);
  });

  it('treats the last 40% as still worth resuming', () => {
    // The mirror: a guard that always fires deletes resume entirely.
    expect(isEffectivelyFinished(60, 100)).toBe(false);
  });

  it('uses the documented constant, not a hardcoded 90', () => {
    const duration = 1000;
    const justPast = Math.ceil(RESUME_MAX_FRACTION * duration) + 1;
    expect(isEffectivelyFinished(justPast, duration)).toBe(true);
  });

  it('never claims an unknown-duration item is finished', () => {
    // A live channel and an unmeasured file both report 0. We have no
    // basis for the verdict, so the position is trusted.
    expect(isEffectivelyFinished(9999, 0)).toBe(false);
  });
});

describe('shouldRecordCheckpoint', () => {
  it('records a real viewing', () => {
    expect(
      shouldRecordCheckpoint({positionSec: 42, durationSec: 600}),
    ).toBe(true);
  });

  it('ignores a tap that barely moved the playhead', () => {
    // Opening something and immediately backing out is not a viewing,
    // and an entry for it pushes everything real down a 20-slot list.
    expect(
      shouldRecordCheckpoint({
        positionSec: MIN_CHECKPOINT_POSITION_SEC - 1,
        durationSec: 600,
      }),
    ).toBe(false);
  });

  it('records exactly at the minimum', () => {
    expect(
      shouldRecordCheckpoint({
        positionSec: MIN_CHECKPOINT_POSITION_SEC,
        durationSec: 600,
      }),
    ).toBe(true);
  });

  it('NEVER records an unknown duration', () => {
    // This is the live-TV / radio case. A "position" against a live
    // stream means nothing, and resuming one would drop the user
    // mid-broadcast at an arbitrary offset.
    expect(
      shouldRecordCheckpoint({positionSec: 120, durationSec: 0}),
    ).toBe(false);
  });

  it('never records a negative position', () => {
    expect(
      shouldRecordCheckpoint({positionSec: -5, durationSec: 600}),
    ).toBe(false);
  });

  it('still records a finished item, so the shelf keeps its recency', () => {
    // Recording is not the same as resuming. The item belongs in
    // "Recently Played"; `isEffectivelyFinished` is what stops the
    // resume reader from jumping to the credits.
    expect(
      shouldRecordCheckpoint({positionSec: 595, durationSec: 600}),
    ).toBe(true);
  });
});

describe('CHECKPOINT_INTERVAL_MS', () => {
  it('is a 30-second cadence, not a per-tick write', () => {
    // The store is persisted to MMKV. `positionMs` advances 4x/second,
    // so a per-tick write means a serialise + flush every quarter
    // second for the whole runtime.
    expect(CHECKPOINT_INTERVAL_MS).toBe(30_000);
  });
});