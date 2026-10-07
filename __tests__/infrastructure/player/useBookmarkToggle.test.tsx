/**
 * W9.4 — the player's bookmark toggle.
 *
 * The semantics here are not arbitrary, so the tests below state the
 * decisions rather than just the code:
 *
 *   - **Position-scoped, not file-scoped.** SIMBA's model is
 *     `(fileUri, position)` with multiple bookmarks per file, matching
 *     Jellyfin Enhanced and MyVideoSpot rather than Netflix/YouTube's
 *     title-level "Save". Pressing bookmarks *here*.
 *   - **Replaying is an update, not a duplicate.** Two presses at the
 *     same moment collapse to one bookmark, matching the store's own
 *     dedup predicate — which is why both import one constant.
 *   - **A full list parks the write.** It must never silently evict the
 *     user's oldest bookmark.
 */

import * as React from 'react';
import {renderHook, act} from '@testing-library/react-native';

let mockTransportState = {
  positionMs: 0,
  durationMs: 600_000,
  isPlaying: true,
  title: 'Namus Kanla Yazilir',
};
jest.mock('../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({state: mockTransportState, commands: {}}),
}));

import {useBookmarkToggle} from '../../../src/infrastructure/player/useBookmarkToggle';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {useBookmarksStore} from '../../../src/state/bookmarksStore';
import {MAX_BOOKMARK_ENTRIES} from '../../../src/state/bookmarksStore';
import type {Bookmark} from '../../../src/state/bookmarksStore';

const URI = 'file:///movies/film.mkv';

function seedBookmark(over: Partial<Bookmark> = {}): void {
  useBookmarksStore.getState().addBookmark({
    bookmark: {
      fileUri: URI,
      title: 'Film',
      position: 60,
      duration: 600,
      createdAt: '2026-01-01T00:00:00.000Z',
      label: '',
      mediaType: 'video',
      type: 'movie',
      source: 'local',
      ...over,
    } as never,
  });
}

describe('useBookmarkToggle', () => {
  beforeEach(async () => {
    useBookmarksStore.getState().reset();
    useNowPlayingStore.getState().reset();
    mockTransportState = {
      positionMs: 60_000,
      durationMs: 600_000,
      isPlaying: true,
      title: 'Namus Kanla Yazilir',
    };
    await act(async () => {
      useNowPlayingStore.getState().begin({
        uri: URI,
        title: 'Namus Kanla Yazilir',
        type: 'movie',
        mediaLane: 'video',
      });
    });
  });

  it('reports not-bookmarked when nothing exists', async () => {
    const {result} = await renderHook(() => useBookmarkToggle());

    expect(result.current.isBookmarkedHere).toBe(false);
    expect(result.current.hasAnyBookmark).toBe(false);
    expect(result.current.unavailable).toBe(false);
  });

  it('adds a bookmark at the playhead', async () => {
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({fileUri: URI, position: 60});
  });

  it('removes the bookmark when pressed again at the same moment', async () => {
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});
    expect(useBookmarksStore.getState().items).toHaveLength(1);

    await act(async () => {result.current.onToggle();});
    expect(useBookmarksStore.getState().items).toHaveLength(0);
  });

  it('replaying the same moment UPDATES rather than duplicating', async () => {
    // Pressing twice around the same playhead position must collapse to
    // one bookmark, not two. This is the "collapse retries" half of the
    // rule Plembfin documents; the "keep genuine rewatches" half is the
    // next test.
    seedBookmark({position: 60});
    const {result} = await renderHook(() => useBookmarkToggle());

    expect(result.current.isBookmarkedHere).toBe(true);

    await act(async () => {result.current.onToggle();});
    await act(async () => {result.current.onToggle();});

    expect(useBookmarksStore.getState().items).toHaveLength(1);
  });

  it('a genuinely different moment creates a SECOND bookmark', async () => {
    // The mirror. Suppressing this would delete the user's ability to
    // mark two interesting scenes in one film — the whole point of the
    // position-scoped model.
    seedBookmark({position: 60});
    mockTransportState = {...mockTransportState, positionMs: 300_000};

    const {result} = await renderHook(() => useBookmarkToggle());
    expect(result.current.isBookmarkedHere).toBe(false);
    expect(result.current.hasAnyBookmark).toBe(true);

    await act(async () => {result.current.onToggle();});

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.map(i => i.position).sort((a, b) => a - b)).toEqual([60, 300]);
  });

  it('matches a bookmark saved under a different spelling of the same uri', async () => {
    // The player launches `file:///a/b.mkv`; a file-picker launch
    // carries `/a/b.mkv`. On a raw compare the toggle would report "not
    // bookmarked" and pressing it would create a second bookmark for a
    // file that already had one.
    seedBookmark({fileUri: '/movies/film.mkv', position: 60});

    const {result} = await renderHook(() => useBookmarkToggle());

    expect(result.current.isBookmarkedHere).toBe(true);
  });

  it('is unavailable with no session, so the control can hide itself', async () => {
    // Per SPEC I11: a control that cannot act must render nothing, not
    // a permanently muted icon.
    useNowPlayingStore.getState().reset();

    const {result} = await renderHook(() => useBookmarkToggle());

    expect(result.current.unavailable).toBe(true);
  });

  it('does nothing when there is no session', async () => {
    useNowPlayingStore.getState().reset();
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});

    expect(useBookmarksStore.getState().items).toHaveLength(0);
  });

  it('parks the write when the list is full rather than evicting', async () => {
    for (let i = 0; i < MAX_BOOKMARK_ENTRIES; i++) {
      seedBookmark({
        fileUri: `file:///other/film-${i}.mkv`,
        position: i,
        createdAt: new Date(Date.UTC(2020, 0, i + 1)).toISOString(),
      });
    }
    // Same file, different position, so it is a genuinely new bookmark.
    seedBookmark({position: 60, createdAt: '2020-01-01T00:00:00.000Z'});
    const before = useBookmarksStore.getState().items.length;

    mockTransportState = {...mockTransportState, positionMs: 120_000};
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});

    expect(result.current.needsEviction).toBe(true);
    expect(useBookmarksStore.getState().items).toHaveLength(before);
  });

  it('confirming the eviction replaces exactly the bookmark the user chose', async () => {
    for (let i = 0; i < MAX_BOOKMARK_ENTRIES; i++) {
      seedBookmark({
        fileUri: `file:///other/film-${i}.mkv`,
        position: i,
        createdAt: new Date(Date.UTC(2020, 0, i + 1)).toISOString(),
      });
    }
    seedBookmark({position: 60, createdAt: '2020-01-01T00:00:00.000Z'});

    mockTransportState = {...mockTransportState, positionMs: 120_000};
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});

    // Deliberately NOT the oldest. The old implementation picked the
    // oldest for the user; the whole point of the chooser is that the
    // user picks. This assertion is what fails if someone reinstates
    // the automatic policy behind the dialog's back.
    //
    // Selected by id, not by a hand-written `fileUri` literal: the store
    // persists the NORMALISED spelling (`mediaKey`), so matching on a
    // bare path finds nothing and the assertion below would pass for
    // the wrong reason — which is exactly how the previous version of
    // this test was green while asserting nothing.
    const itemsBefore = useBookmarksStore.getState().items;
    // film-0 is absent: seeding 20 "other" bookmarks and then one more
    // on the played URI is 21 adds, so the store's own cap evicted the
    // tail. `oldest` below is therefore the oldest SURVIVING bookmark,
    // which is what the old policy would have picked.
    const victim = itemsBefore.find(b => b.fileUri === 'file:///other/film-7.mkv');
    const oldest = itemsBefore
      .filter(b => b.fileUri.startsWith('file:///other/'))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
    expect(victim).toBeDefined();
    expect(oldest).toBeDefined();
    expect(victim!.id).not.toBe(oldest!.id);

    await act(async () => {result.current.confirmEviction(victim!.id);});

    const items = useBookmarksStore.getState().items;
    // The chosen one is gone...
    expect(items.some(b => b.id === victim!.id)).toBe(false);
    // ...the oldest, which the user did NOT choose, survives...
    expect(items.some(b => b.id === oldest!.id)).toBe(true);
    // ...and the new bookmark landed.
    expect(items.some(b => b.position === 120)).toBe(true);
    expect(items).toHaveLength(MAX_BOOKMARK_ENTRIES);
  });

  it('abandoning a parked request writes nothing at all', async () => {
    for (let i = 0; i < MAX_BOOKMARK_ENTRIES; i++) {
      seedBookmark({
        fileUri: `file:///other/film-${i}.mkv`,
        position: i,
        createdAt: new Date(Date.UTC(2020, 0, i + 1)).toISOString(),
      });
    }
    seedBookmark({position: 60, createdAt: '2020-01-01T00:00:00.000Z'});
    const before = useBookmarksStore.getState().items;

    mockTransportState = {...mockTransportState, positionMs: 120_000};
    const {result} = await renderHook(() => useBookmarkToggle());

    await act(async () => {result.current.onToggle();});
    expect(result.current.needsEviction).toBe(true);
    await act(async () => {result.current.cancelEviction();});

    expect(result.current.needsEviction).toBe(false);
    // Dismissing the chooser must leave the list EXACTLY as it was —
    // neither a new bookmark nor a victim.
    expect(useBookmarksStore.getState().items).toEqual(before);
  });

  it('exposes markers normalised to 0…1 for the timeline', async () => {
    seedBookmark({position: 150});
    seedBookmark({position: 300});

    const {result} = await renderHook(() => useBookmarkToggle());

    expect(result.current.all.map(b => b.position)).toEqual([150, 300]);
  });
});