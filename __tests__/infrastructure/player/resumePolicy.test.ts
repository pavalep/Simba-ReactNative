/**
 * V21 W22 F/U #2 — `resolveResumeMs` (the pure helper backing
 * `<SimbaPlayer resumePolicy>`) unit tests.
 *
 * The helper is a pure function of (bookmarks, history, id) → ms.
 * No React, no Zustand, no module mocking — just shape the
 * inputs and assert the output. See `resumePolicy.ts` for the
 * priority order (bookmark first, history fallback) and the
 * seconds→ms conversion (both stores persist `position` in
 * seconds; the bridge field is ms).
 */

import {resolveResumeMs} from '../../../src/infrastructure/player/resumePolicy';
import type {Bookmark} from '../../../src/state/bookmarksStore';
import type {RecentHistoryEntry} from '../../../src/state/recentHistoryStore';

// Minimal shape stubs — the helper only reads `id`, `fileUri`,
// `createdAt`, and `position`. Every other field is ignored.
function makeBookmark(overrides: Partial<Bookmark>): Bookmark {
  return {
    id: 'b-default',
    fileUri: 'file:///default',
    title: 'Default',
    position: 0,
    duration: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    label: '',
    mediaType: 'video' as never,
    type: 'local' as never,
    source: 'local' as never,
    ...overrides,
  } as Bookmark;
}

function makeHistory(overrides: Partial<RecentHistoryEntry>): RecentHistoryEntry {
  return {
    fileUri: 'file:///default',
    title: 'Default',
    position: 0,
    duration: 0,
    lastPlayedAt: '2026-01-01T00:00:00.000Z',
    thumbnailPath: '',
    mediaType: 'video' as never,
    type: 'local' as never,
    source: 'local' as never,
    ...overrides,
  } as RecentHistoryEntry;
}

describe('resolveResumeMs (V21 W22 F/U #2)', () => {
  it('returns the bookmark position in ms when one bookmark matches', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: 30})],
        history: [],
      },
      'file:///x',
    );
    expect(ms).toBe(30_000);
  });

  it('picks the LATEST bookmark when multiple positions exist per URI (A14)', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [
          makeBookmark({
            id: 'b-older',
            fileUri: 'file:///x',
            position: 10,
            createdAt: '2026-01-01T00:00:00.000Z',
          }),
          makeBookmark({
            id: 'b-newer',
            fileUri: 'file:///x',
            position: 45,
            createdAt: '2026-02-01T00:00:00.000Z',
          }),
          makeBookmark({
            id: 'b-middle',
            fileUri: 'file:///x',
            position: 22,
            createdAt: '2026-01-15T00:00:00.000Z',
          }),
        ],
        history: [],
      },
      'file:///x',
    );
    expect(ms).toBe(45_000);
  });

  it('rounds fractional seconds to the nearest ms', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: 12.345})],
        history: [],
      },
      'file:///x',
    );
    expect(ms).toBe(12_345);
  });

  it('falls back to history when no bookmark exists for the id', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [],
        history: [makeHistory({fileUri: 'file:///y', position: 60})],
      },
      'file:///y',
    );
    expect(ms).toBe(60_000);
  });

  it('prefers bookmark over history when both have the id (explicit wins)', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: 30})],
        history: [makeHistory({fileUri: 'file:///x', position: 999})],
      },
      'file:///x',
    );
    expect(ms).toBe(30_000);
  });

  it('falls through to history when the only bookmark for the id has position 0', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: 0})],
        history: [makeHistory({fileUri: 'file:///x', position: 60})],
      },
      'file:///x',
    );
    expect(ms).toBe(60_000);
  });

  it('returns undefined when neither store has the id', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///a', position: 30})],
        history: [makeHistory({fileUri: 'file:///b', position: 60})],
      },
      'file:///x',
    );
    expect(ms).toBeUndefined();
  });

  it('returns undefined when both stores have the id but with position 0', () => {
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: 0})],
        history: [makeHistory({fileUri: 'file:///x', position: 0})],
      },
      'file:///x',
    );
    expect(ms).toBeUndefined();
  });

  it('returns undefined for empty stores', () => {
    const ms = resolveResumeMs({bookmarks: [], history: []}, 'file:///x');
    expect(ms).toBeUndefined();
  });

  it('ignores negative positions (defensive)', () => {
    // A negative position is nonsensical (you can't be 5 seconds
    // BEFORE the start of the file). The module's `useOpenWithResume`
    // also rejects negatives (see useOpenWithResume.tsx:131: `saved > 0`),
    // so the helper is consistent.
    const ms = resolveResumeMs(
      {
        bookmarks: [makeBookmark({fileUri: 'file:///x', position: -5})],
        history: [],
      },
      'file:///x',
    );
    expect(ms).toBeUndefined();
  });
});
