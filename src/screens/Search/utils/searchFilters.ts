// ─── The Search page's filter core ───────────────────────────────────────
//
// Why this file exists
// ────────────────────
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN): the Search page had TWO sets of
// results — the LOCAL ones (the device's own library) and the REMOTE ones
// (five free APIs) — and the filter sheet's controls were applied to the
// local set only. `RemoteResults` was handed the raw arrays, so on any
// query whose results came from the APIs, the sheet did nothing at all.
//
// Device proof, on the running app (query "music"):
//   • TYPE = Videos  → the chip went gold, the FAB badge counted 1, and
//     every visible row was still a music track.
//   • SORT BY = Name → the chip went gold, the badge counted 2, and the
//     order was byte-identical to the order before.
//
// This file is where the scope, the media-kind filter and the sort are
// applied, to BOTH sets. It is pure — no React, no hooks — so the rules
// are testable on their own (see `__tests__/app/searchFilters.test.ts`).
//
// THE THREE AXES
// ──────────────
//
// 1. SCOPE — which catalogue the results come from. It also decides
//    which remote sources are visible at all.
// 2. TYPE — video or audio. It applies to the remote sources as well as
//    the local ones, because every remote source has a known kind (see
//    `REMOTE_SOURCES`). The entity groups (artists, albums, playlists,
//    folders) are neither, so a TYPE filter hides them.
// 3. SORT — relevance or name. "Date" is NOT offered: only the
//    recent-history entries carry a date (`useSearch.ts` sets
//    `lastPlayedAt` on that one source), so on everything else it was a
//    control that did nothing.

import type {
  AggregatedSearchResults,
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
  PodcastResult,
  RadioStationResult,
} from '../../../types/api';
import type {SearchResultItem} from '../../../hooks/useSearch';

/** The media-kind filter. */
export type MediaKindFilter = 'all' | 'videos' | 'audio';

/** The sort. "Date" was removed — see the header. */
export type SearchSort = 'relevance' | 'name';

/**
 * Which catalogue the search is looking in.
 *
 * `podcasts` and `radio` are GONE: their adapters are not built
 * (`useAggregatedSearch` returns `podcasts: []` and `radioStations: []`
 * because Podcast Index needs SHA1 auth and Radio Browser needs a
 * name-based query), so the chips that selected them could only ever
 * draw an empty page.
 */
export type SearchScope = 'all' | 'local' | 'music' | 'tv' | 'audiobooks' | 'archive';

interface RemoteSourceSpec<T> {
  /**
   * The kind of media the source holds.
   *
   * The vocabulary is the FILTER's vocabulary (`videos` | `audio`), so
   * the comparison is a plain equality and there is no second table
   * translating one into the other.
   */
  kind: 'videos' | 'audio';
  /** The result's display title — the sort key. */
  title: (item: T) => string;
}

/**
 * The remote sources, and what each one holds.
 *
 * The `kind` is declared HERE and not read from the results, because the
 * API adapters do not set the optional `mediaType` field on
 * `ApiMediaClassification` — there is no value to read. This map is the
 * one owner of that fact.
 */
export const REMOTE_SOURCES = {
  podcasts: {kind: 'audio', title: (p: PodcastResult) => p.title},
  radioStations: {kind: 'audio', title: (r: RadioStationResult) => r.name},
  audiobooks: {kind: 'audio', title: (a: AudiobookResult) => a.title},
  iptvChannels: {kind: 'videos', title: (c: IPTVChannelResult) => c.name},
  jamendoTracks: {kind: 'audio', title: (t: JamendoTrackResult) => t.name},
  internetArchiveItems: {
    kind: 'audio',
    title: (i: InternetArchiveItemResult) => i.title,
  },
  audiusTracks: {kind: 'audio', title: (t: AudiusTrackResult) => t.title},
} satisfies {
  [K in keyof AggregatedSearchResults]: RemoteSourceSpec<AggregatedSearchResults[K][number]>;
};

type RemoteSourceKey = keyof AggregatedSearchResults;

/**
 * Which remote sources each scope shows.
 *
 * `podcasts` and `radioStations` are in NO scope: their adapters are not
 * built, so there is nothing for a scope to show.
 */
const SCOPE_SOURCES: Record<Exclude<SearchScope, 'local'>, RemoteSourceKey[]> = {
  all: [
    'jamendoTracks',
    'audiusTracks',
    'iptvChannels',
    'audiobooks',
    'internetArchiveItems',
  ],
  music: ['jamendoTracks', 'audiusTracks'],
  tv: ['iptvChannels'],
  audiobooks: ['audiobooks'],
  archive: ['internetArchiveItems'],
};

/** The scopes, in the order the scope row draws them. */
export const SEARCH_SCOPES: {key: SearchScope; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'local', label: 'Local'},
  {key: 'music', label: 'Music'},
  {key: 'tv', label: 'TV'},
  {key: 'audiobooks', label: 'Audiobooks'},
  {key: 'archive', label: 'Archive'},
];

function byTitle<T>(items: T[], title: (item: T) => string): T[] {
  return [...items].sort((a, b) => title(a).localeCompare(title(b)));
}

function filterRemoteSource<T>(
  items: T[],
  spec: RemoteSourceSpec<T>,
  visible: boolean,
  kind: MediaKindFilter,
  sort: SearchSort,
): T[] {
  if (!visible) return [];
  if (kind !== 'all' && spec.kind !== kind) return [];
  return sort === 'name' ? byTitle(items, spec.title) : items;
}

/**
 * The remote results, after the scope, the kind and the sort.
 *
 * `sort === 'relevance'` keeps the order the API returned, which IS the
 * API's relevance order.
 */
export function applyRemoteFilters(
  results: AggregatedSearchResults,
  scope: SearchScope,
  kind: MediaKindFilter,
  sort: SearchSort,
): AggregatedSearchResults {
  const visible =
    scope === 'local' ? [] : SCOPE_SOURCES[scope];
  const inScope = (key: RemoteSourceKey) => visible.includes(key);

  return {
    podcasts: filterRemoteSource(
      results.podcasts,
      REMOTE_SOURCES.podcasts,
      inScope('podcasts'),
      kind,
      sort,
    ),
    radioStations: filterRemoteSource(
      results.radioStations,
      REMOTE_SOURCES.radioStations,
      inScope('radioStations'),
      kind,
      sort,
    ),
    audiobooks: filterRemoteSource(
      results.audiobooks,
      REMOTE_SOURCES.audiobooks,
      inScope('audiobooks'),
      kind,
      sort,
    ),
    iptvChannels: filterRemoteSource(
      results.iptvChannels,
      REMOTE_SOURCES.iptvChannels,
      inScope('iptvChannels'),
      kind,
      sort,
    ),
    jamendoTracks: filterRemoteSource(
      results.jamendoTracks,
      REMOTE_SOURCES.jamendoTracks,
      inScope('jamendoTracks'),
      kind,
      sort,
    ),
    internetArchiveItems: filterRemoteSource(
      results.internetArchiveItems,
      REMOTE_SOURCES.internetArchiveItems,
      inScope('internetArchiveItems'),
      kind,
      sort,
    ),
    audiusTracks: filterRemoteSource(
      results.audiusTracks,
      REMOTE_SOURCES.audiusTracks,
      inScope('audiusTracks'),
      kind,
      sort,
    ),
  };
}

/**
 * The local results, after the scope, the kind and the sort.
 *
 * The entity groups (artists, albums, playlists, folders) are hidden by
 * a kind filter: they are not media, so "Videos" and "Audio" do not
 * apply to them.
 */
export function applyLocalFilters(
  items: SearchResultItem[],
  scope: SearchScope,
  kind: MediaKindFilter,
  sort: SearchSort,
): SearchResultItem[] {
  if (scope !== 'all' && scope !== 'local') return [];

  let filtered = items;
  if (kind === 'videos') {
    filtered = filtered.filter(item => item.group === 'videos');
  } else if (kind === 'audio') {
    filtered = filtered.filter(item => item.group === 'audio');
  }

  if (sort === 'name') {
    return byTitle(filtered, item => item.title);
  }
  return [...filtered].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/** How many remote results are on screen after the filters. */
export function countRemoteResults(results: AggregatedSearchResults): number {
  return (
    results.podcasts.length +
    results.radioStations.length +
    results.audiobooks.length +
    results.iptvChannels.length +
    results.jamendoTracks.length +
    results.internetArchiveItems.length +
    results.audiusTracks.length
  );
}
