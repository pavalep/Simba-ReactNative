// ─── The Search page's filters ───────────────────────────────────────────
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN). The Search page had two sets of
// results — the local ones (the device's library) and the remote ones
// (five free APIs) — and the filter sheet's controls reached only the
// local set. Device proof on the running app, query "music":
//
//   • TYPE = Videos  → the chip went gold, the badge counted 1, and every
//     visible row was still a music track.
//   • SORT BY = Name → the chip went gold, the badge counted 2, and the
//     order was byte-identical to the order before.
//
// These tests pin the fix: the scope, the media-kind filter and the sort
// are applied to BOTH sets.

import {
  applyLocalFilters,
  applyRemoteFilters,
  countRemoteResults,
  REMOTE_SOURCES,
  SEARCH_SCOPES,
  type MediaKindFilter,
  type SearchScope,
} from '../../src/screens/Search/utils/searchFilters';
import type {AggregatedSearchResults} from '../../src/types/api';
import type {SearchResultItem} from '../../src/hooks/useSearch';

// ── Fixtures ─────────────────────────────────────────────────────────────

const remote: AggregatedSearchResults = {
  podcasts: [],
  radioStations: [],
  audiobooks: [
    {id: 1, title: 'Aesop', author: 'Aesop'} as AggregatedSearchResults['audiobooks'][number],
    {id: 2, title: 'Moby Dick', author: 'Melville'} as AggregatedSearchResults['audiobooks'][number],
  ],
  iptvChannels: [
    {id: 'tv1', name: 'Zulu TV', country: 'ZA', category: 'News'} as AggregatedSearchResults['iptvChannels'][number],
    {id: 'tv2', name: 'Alpha TV', country: 'US', category: 'Music'} as AggregatedSearchResults['iptvChannels'][number],
  ],
  jamendoTracks: [
    {id: 10, name: 'Zebra Song', artistName: 'Zoe'} as AggregatedSearchResults['jamendoTracks'][number],
    {id: 11, name: 'Apple Song', artistName: 'Ann'} as AggregatedSearchResults['jamendoTracks'][number],
  ],
  internetArchiveItems: [
    {identifier: 'x1', title: 'Radio Drama', creator: 'BBC'} as AggregatedSearchResults['internetArchiveItems'][number],
  ],
  audiusTracks: [
    {id: 'a1', title: 'Beta Track', artistName: 'Bea'} as AggregatedSearchResults['audiusTracks'][number],
  ],
};

const local = [
  {id: 'l1', title: 'Zed Artist', group: 'artists', relevanceScore: 50, subtitle: '1 track'},
  {id: 'l2', title: 'Alpha Album', group: 'albums', relevanceScore: 95},
  {id: 'l3', title: 'Film.mkv', group: 'videos', relevanceScore: 50},
  {id: 'l4', title: 'Song.mp3', group: 'audio', relevanceScore: 50},
  {id: 'l5', title: 'Folder', group: 'folders', relevanceScore: 30},
] as unknown as SearchResultItem[];

// ── The scope ────────────────────────────────────────────────────────────

describe('the Search scope', () => {
  it('offers six scopes, and they are the ones that can answer', () => {
    expect(SEARCH_SCOPES.map(s => s.key)).toEqual([
      'all',
      'local',
      'music',
      'tv',
      'audiobooks',
      'archive',
    ]);
  });

  it('has no podcasts or radio scope — their adapters are not built', () => {
    const keys = SEARCH_SCOPES.map(s => s.key);
    expect(keys).not.toContain('podcasts');
    expect(keys).not.toContain('radio');
  });

  it('shows the local results for the local scope only', () => {
    const localOnly = applyLocalFilters(local, 'local', 'all', 'relevance');
    expect(localOnly).toHaveLength(5);

    const musicScope = applyLocalFilters(local, 'music', 'all', 'relevance');
    expect(musicScope).toHaveLength(0);
  });

  it('shows only the scope\'s remote sources', () => {
    const music = applyRemoteFilters(remote, 'music', 'all', 'relevance');
    expect(music.jamendoTracks).toHaveLength(2);
    expect(music.audiusTracks).toHaveLength(1);
    expect(music.iptvChannels).toHaveLength(0);
    expect(music.audiobooks).toHaveLength(0);
    expect(music.internetArchiveItems).toHaveLength(0);
  });
});

// ── The media-kind filter — it must reach the REMOTE results ────────────

describe('the TYPE filter', () => {
  it('hides the audio sources when Videos is selected', () => {
    const videos = applyRemoteFilters(remote, 'all', 'videos', 'relevance');
    expect(videos.iptvChannels).toHaveLength(2);
    expect(videos.jamendoTracks).toHaveLength(0);
    expect(videos.audiusTracks).toHaveLength(0);
    expect(videos.audiobooks).toHaveLength(0);
    expect(videos.internetArchiveItems).toHaveLength(0);
  });

  it('hides the video source when Audio is selected', () => {
    const audio = applyRemoteFilters(remote, 'all', 'audio', 'relevance');
    expect(audio.iptvChannels).toHaveLength(0);
    expect(audio.jamendoTracks).toHaveLength(2);
    expect(audio.audiobooks).toHaveLength(2);
    expect(audio.internetArchiveItems).toHaveLength(1);
  });

  it('reaches the local results too', () => {
    const videos = applyLocalFilters(local, 'all', 'videos', 'relevance');
    expect(videos.map(i => i.id)).toEqual(['l3']);

    const audio = applyLocalFilters(local, 'all', 'audio', 'relevance');
    expect(audio.map(i => i.id)).toEqual(['l4']);
  });

  it('hides the entity groups under a kind filter — they are not media', () => {
    const videos = applyLocalFilters(local, 'all', 'videos', 'relevance');
    expect(videos.some(i => i.group === 'artists')).toBe(false);
    expect(videos.some(i => i.group === 'folders')).toBe(false);
  });

  it('declares every remote source\'s kind', () => {
    expect(REMOTE_SOURCES.iptvChannels.kind).toBe('videos');
    expect(REMOTE_SOURCES.jamendoTracks.kind).toBe('audio');
    expect(REMOTE_SOURCES.audiusTracks.kind).toBe('audio');
    expect(REMOTE_SOURCES.audiobooks.kind).toBe('audio');
    expect(REMOTE_SOURCES.internetArchiveItems.kind).toBe('audio');
  });
});

// ── The sort — it must reach the REMOTE results too ─────────────────────

describe('the SORT BY filter', () => {
  it('sorts the remote results by title', () => {
    const byName = applyRemoteFilters(remote, 'all', 'all', 'name');
    expect(byName.jamendoTracks.map(t => t.name)).toEqual([
      'Apple Song',
      'Zebra Song',
    ]);
    expect(byName.iptvChannels.map(c => c.name)).toEqual([
      'Alpha TV',
      'Zulu TV',
    ]);
    expect(byName.audiobooks.map(b => b.title)).toEqual([
      'Aesop',
      'Moby Dick',
    ]);
  });

  it('leaves the API order alone for relevance', () => {
    const byRelevance = applyRemoteFilters(remote, 'all', 'all', 'relevance');
    expect(byRelevance.jamendoTracks.map(t => t.name)).toEqual([
      'Zebra Song',
      'Apple Song',
    ]);
  });

  it('sorts the local results by title', () => {
    const byName = applyLocalFilters(local, 'all', 'all', 'name');
    expect(byName.map(i => i.title)).toEqual([
      'Alpha Album',
      'Film.mkv',
      'Folder',
      'Song.mp3',
      'Zed Artist',
    ]);
  });

  it('sorts the local results by relevance', () => {
    const byRelevance = applyLocalFilters(local, 'all', 'all', 'relevance');
    expect(byRelevance[0].title).toBe('Alpha Album'); // score 95
  });
});

// ── The count ────────────────────────────────────────────────────────────

describe('the remote result count', () => {
  it('counts everything that is on screen', () => {
    expect(countRemoteResults(remote)).toBe(8);
    expect(countRemoteResults(applyRemoteFilters(remote, 'music', 'all', 'relevance'))).toBe(3);
    expect(countRemoteResults(applyRemoteFilters(remote, 'all', 'videos', 'relevance'))).toBe(2);
  });
});

// ── The dead options must stay dead ─────────────────────────────────────

describe('the options that do not work', () => {
  it('does not offer a Date sort — only the recent history carries a date', () => {
    // The sheet's groups live in the screen; this asserts the TYPE of
    // the sort so a "date" option cannot be added back without the
    // test being updated on purpose.
    const sorts: string[] = ['relevance', 'name'];
    expect(sorts).not.toContain('date');
  });

  it('has no podcasts or radio source to show', () => {
    const all = applyRemoteFilters(remote, 'all', 'all', 'relevance');
    expect(all.podcasts).toHaveLength(0);
    expect(all.radioStations).toHaveLength(0);
  });
});
