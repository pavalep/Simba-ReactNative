/**
 * V21 W7 P27 — Download policy + age-based cleanup unit tests.
 *
 * The download service is heavily stateful (in-memory `records`
 * array, AsyncStorage manifest, RNFS file IO, active RNFS jobs).
 * Integration-testing the full service requires mocking RNFS +
 * AsyncStorage. The W7 P27 work extracted the **pure** age-based
 * policy decision into a top-level function
 * (`selectExpiredDownloads`) so it can be tested without mocks.
 *
 * These tests cover:
 *   - `selectExpiredDownloads(records, now, maxAgeMs)` — the pure
 *     policy decision; only `done` records with non-null
 *     `downloadedAt` are eligible for expiry.
 *   - Defensive cases: `null`/0/negative/NaN/Infinity `maxAgeMs`
 *     disable the policy.
 *   - Records in other states (`downloading` / `paused` / `error`)
 *     are NEVER expired, even if their `downloadedAt` is old.
 *   - The cutoff is **exclusive**: a record exactly `maxAgeMs` old
 *     is still kept; `maxAgeMs + 1ms` is the first expiry.
 */

import {
  selectExpiredDownloads,
  type DownloadRecord,
} from '../../src/services/downloadService';

// ─── Fixtures ─────────────────────────────────────────────────

const NOW = 1_700_000_000_000; // fixed point in time for the tests
const DAY_MS = 24 * 60 * 60 * 1000;

function makeRecord(overrides: Partial<DownloadRecord> = {}): DownloadRecord {
  return {
    uri: 'https://example.com/song.mp3',
    localPath: '/data/song.mp3',
    title: 'Song',
    size: 1024,
    received: 1024,
    status: 'done',
    mediaType: 'audio',
    type: 'music',
    source: 'api',
    downloadedAt: NOW,
    ...overrides,
  };
}

// ─── selectExpiredDownloads ──────────────────────────────────

describe('selectExpiredDownloads (V21 W7 P27)', () => {
  it('returns all records as keep when maxAgeMs is null', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'a', downloadedAt: NOW - 365 * DAY_MS}),
      makeRecord({uri: 'b', downloadedAt: NOW - 1 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, null);
    expect(keep).toHaveLength(2);
    expect(expired).toHaveLength(0);
  });

  it('returns all records as keep when maxAgeMs is 0', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'a', downloadedAt: NOW - 1 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 0);
    expect(keep).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  it('returns all records as keep when maxAgeMs is negative', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'a', downloadedAt: NOW - 1 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, -1);
    expect(keep).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  it('returns all records as keep when maxAgeMs is NaN/Infinity', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'a', downloadedAt: NOW - 1 * DAY_MS}),
    ];
    expect(selectExpiredDownloads(records, NOW, Number.NaN).expired).toHaveLength(0);
    expect(
      selectExpiredDownloads(records, NOW, Number.POSITIVE_INFINITY).expired,
    ).toHaveLength(0);
  });

  it('expires a 31-day-old record against a 30-day policy', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'old', downloadedAt: NOW - 31 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(expired).toHaveLength(1);
    expect(expired[0].uri).toBe('old');
    expect(keep).toHaveLength(0);
  });

  it('keeps a 29-day-old record against a 30-day policy', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'recent', downloadedAt: NOW - 29 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(keep).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  it('keeps a record exactly at the boundary (exclusive cutoff)', () => {
    // A record downloaded exactly `maxAgeMs` ago is still kept.
    // `maxAgeMs + 1ms` is the first age considered expired.
    const records: DownloadRecord[] = [
      makeRecord({uri: 'boundary', downloadedAt: NOW - 30 * DAY_MS}),
      makeRecord({uri: 'just-over', downloadedAt: NOW - 30 * DAY_MS - 1}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(keep.map(r => r.uri)).toEqual(['boundary']);
    expect(expired.map(r => r.uri)).toEqual(['just-over']);
  });

  it('never expires non-done records (downloading/paused/error)', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'dl', status: 'downloading', downloadedAt: NOW - 365 * DAY_MS}),
      makeRecord({uri: 'paused', status: 'paused', downloadedAt: NOW - 365 * DAY_MS}),
      makeRecord({uri: 'err', status: 'error', downloadedAt: NOW - 365 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(keep).toHaveLength(3);
    expect(expired).toHaveLength(0);
  });

  it('never expires a done record with null downloadedAt (defensive)', () => {
    // A `done` record with `downloadedAt: null` should not be
    // treated as "infinitely old" and expired; we simply can't
    // know its age, so keep it.
    const records: DownloadRecord[] = [
      makeRecord({uri: 'mystery', downloadedAt: null}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(keep).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  it('partitions a mixed list correctly', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'keep1', downloadedAt: NOW - 5 * DAY_MS}),
      makeRecord({uri: 'keep2', downloadedAt: NOW - 25 * DAY_MS}),
      makeRecord({uri: 'exp1', downloadedAt: NOW - 31 * DAY_MS}),
      makeRecord({uri: 'exp2', downloadedAt: NOW - 100 * DAY_MS}),
      makeRecord({uri: 'paused', status: 'paused', downloadedAt: NOW - 365 * DAY_MS}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 30 * DAY_MS);
    expect(keep.map(r => r.uri).sort()).toEqual(['keep1', 'keep2', 'paused']);
    expect(expired.map(r => r.uri).sort()).toEqual(['exp1', 'exp2']);
  });

  it('returns the same identity (===) for kept records (no copies)', () => {
    const rec = makeRecord({uri: 'identity', downloadedAt: NOW - 5 * DAY_MS});
    const {keep} = selectExpiredDownloads([rec], NOW, 30 * DAY_MS);
    expect(keep[0]).toBe(rec);
  });

  it('returns the same identity (===) for expired records (no copies)', () => {
    const rec = makeRecord({uri: 'identity', downloadedAt: NOW - 60 * DAY_MS});
    const {expired} = selectExpiredDownloads([rec], NOW, 30 * DAY_MS);
    expect(expired[0]).toBe(rec);
  });

  it('handles an empty list', () => {
    const {keep, expired} = selectExpiredDownloads([], NOW, 30 * DAY_MS);
    expect(keep).toHaveLength(0);
    expect(expired).toHaveLength(0);
  });

  it('supports a 1-second maxAge for test convenience', () => {
    const records: DownloadRecord[] = [
      makeRecord({uri: 'now', downloadedAt: NOW}),
      makeRecord({uri: 'old', downloadedAt: NOW - 5000}),
    ];
    const {keep, expired} = selectExpiredDownloads(records, NOW, 1000);
    expect(keep.map(r => r.uri)).toEqual(['now']);
    expect(expired.map(r => r.uri)).toEqual(['old']);
  });
});
