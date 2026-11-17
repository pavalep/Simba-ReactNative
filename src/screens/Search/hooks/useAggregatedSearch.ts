// ─── Aggregated Remote Search Hook ──────────────────────────────────────
// V18.6.2: rewritten on top of `useApiQueries` (TanStack's parallel-
// queries primitive). The old implementation was 88 lines of bespoke
// useState / useEffect / useRef / `Promise.allSettled` plumbing
// with manual `requestRef.current` stale-request cancellation;
// the new implementation is ~70 lines, all of which is the
// per-source `useQuery` shape and the per-source error isolation.
//
// The hook still has a useState + useEffect pair, but those are
// for the debounce (a UI-level concern that should ideally live
// on the SearchBar — see the deprecation note on `debounceMs`).
// The data plumbing itself has 0 useState and 0 useEffect: each
// source is its own `useQuery`, and TanStack owns the loading
// / error / stale-request cancellation logic.

import {useEffect, useMemo, useState} from 'react';
import type {QueryFunctionContext} from '@tanstack/react-query';
import {useApiQueries} from '../../../hooks/useApiQuery';
import {searchAudiobooks} from '../../../infrastructure/api/librivox/adapter';
import {getIPTVCatalogue, type IPTVCatalogue} from '../../../infrastructure/api/iptv/adapter';
import {filterIPTVChannels} from '../../../infrastructure/api/iptv/catalogue';
import {searchJamendoTracks} from '../../../infrastructure/api/jamendo/adapter';
import {searchInternetArchiveAudio} from '../../../infrastructure/api/internetArchive/adapter';
import {searchAudiusTracks} from '../../../infrastructure/api/audius/adapter';
import {getPopularJamendoTracks} from '../../../infrastructure/api/jamendo/adapter';
import {scopeShowsTV, type SearchScope} from '../utils/searchFilters';
import type {
  AggregatedSearchResults,
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
} from '../../../types/api';

export interface AggregatedSearch {
  results: AggregatedSearchResults;
  isLoading: boolean;
  trending: JamendoTrackResult[];
}

/**
 * How many channels one IPTV search answers with.
 *
 * The other four sources each ask their API for six. The IPTV source has
 * no search endpoint — the whole directory is one catalogue, and the term
 * is matched over it in memory — so the count is applied to the RESULT
 * here, the one place that owns it.
 */
const IPTV_RESULT_LIMIT = 6;

/**
 * The catalogue is 2.8 MB, so it is fetched once and kept: the query key
 * carries NO term, and the term is matched over the cached channels.
 *
 * The same cache entry is the one Live TV reads (`['iptv','catalogue']`),
 * so a user who has been to Live TV searches channels without a download.
 */
const IPTV_CATALOGUE_STALE_MS = 30 * 60_000;
const IPTV_CATALOGUE_GC_MS = 60 * 60_000;

/**
 * Run a debounced search across the 5 free-content APIs.
 *
 * @param query        The search term. Empty string = no remote
 *                     queries fire; the `trending` list is fetched
 *                     from Jamendo instead.
 * @param debounceMs   Optional debounce in ms.
 *
 *                     2026-11-12 (SEARCH_PAGE_REDESIGN): the default
 *                     was 450 ms, and the caller passed an ALREADY
 *                     debounced query — `useSearch` settles at 300 ms
 *                     and this hook then waited another 450 ms, so the
 *                     remote results answered **750 ms** after the last
 *                     keystroke while the local ones answered at 300 ms.
 *                     The page answered at two different times.
 *
 *                     The default is now **0**: the query arrives
 *                     settled, and the hook's own debounce is a
 *                     duplicate of the one upstream. A caller that
 *                     passes a RAW query still gets the debounce by
 *                     passing the milliseconds explicitly.
 */
export function useAggregatedSearch(
  query: string,
  debounceMs: number = 0,
  scope: SearchScope = 'all',
): AggregatedSearch {
  // ── Debounce (UI-level concern; ideally pushed to the SearchBar) ──
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  useEffect(() => {
    if (debounceMs <= 0) {
      setDebouncedQuery(query.trim());
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(query.trim()), debounceMs);
    return () => clearTimeout(id);
  }, [query, debounceMs]);

  const enabled = debouncedQuery.length > 0;

  // ── 5 parallel queries (one per free-content source) ──
  // The 5th (Internet Archive) returns PaginatedResult — we map
  // to the inner `.items` array at the boundary. The combine
  // returns both the per-source data (the `results` shape the
  // consumer wants) and a per-source `isFetching` OR (so the
  // "is any source still loading?" flag is a one-liner, not
  // a 3-tier array-by-reference comparison).
  const combined = useApiQueries({
    queries: [
      {
        queryKey: ['librivox', 'search', debouncedQuery, 6] as const,
        queryFn: () => searchAudiobooks(debouncedQuery, {limit: 6}),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: ['iptv', 'catalogue'] as const,
        // IPTV-org has no search endpoint. The whole directory is ONE
        // catalogue — the playlist the source publishes for players —
        // and the term is matched over it in memory.
        //
        // 2026-11-12 (SEARCH_PAGE_REDESIGN): this used to call
        // `getAllIPTVChannels({limit: 6})`, which returns the FIRST SIX
        // CHANNELS OF THE WHOLE IPTV-ORG LIST, whatever was typed. The
        // comment below used to claim "the consumer filters by
        // `debouncedQuery` at the render layer" — and no consumer did.
        // So a search for "music" answered with six unrelated TV
        // channels under a "TV" heading.
        //
        // 2026-11-17 (WAVE B13.1): `searchIPTVChannels` read
        // `api/channels.json` and demanded a stream URL from every
        // record — a field that file does not have — so the query threw
        // for EVERY term and the "TV" group of the search page was
        // permanently empty. It reads the catalogue now, and the same
        // cache entry is the one Live TV reads.
        //
        // The signal is forwarded: the catalogue is 2.8 MB, and without
        // it a user who types and clears left the download running to
        // completion. Live TV passes one (`useLiveTVBrowser.ts:116`).
        // The context is annotated explicitly: `useApiQueries` types its
        // queries through a tuple spread (`readonly [...QueriesOptions<T>]`),
        // which does not contextually type the `queryFn` parameter, so a
        // destructured `{signal}` would be an implicit `any`.
        queryFn: ({signal}: QueryFunctionContext) => getIPTVCatalogue(signal),
        // The catalogue is 2.8 MB, so it is fetched ONLY for the scopes
        // that show the TV group. The scope row is part of the results
        // state and keeps its value while the user types, so a user who
        // searched Music never paid for the catalogue at all — the leg
        // fired for every query and the result was filtered away.
        enabled: enabled && scopeShowsTV(scope),
        staleTime: IPTV_CATALOGUE_STALE_MS,
        gcTime: IPTV_CATALOGUE_GC_MS,
      },
      {
        queryKey: ['jamendo', 'search', debouncedQuery, 6] as const,
        queryFn: () => searchJamendoTracks(debouncedQuery, {limit: 6}),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: ['internetArchive', 'search', debouncedQuery, 6] as const,
        queryFn: () =>
          searchInternetArchiveAudio(debouncedQuery, {limit: 6}).then(r => r.items),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: ['audius', 'search', debouncedQuery, 6] as const,
        queryFn: () => searchAudiusTracks(debouncedQuery, {limit: 6}),
        enabled,
        staleTime: 60_000,
      },
    ],
    combine: ([
      audiobooks,
      iptvCatalogue,
      jamendoTracks,
      internetArchiveItems,
      audiusTracks,
    ]) => ({
      results: {
        podcasts: [], // Podcast Index uses SHA1 auth; excluded from raw aggregator
        radioStations: [], // Radio Browser needs name-based query; skipped here
        audiobooks: (audiobooks.data as AudiobookResult[] | undefined) ?? [],
        // Filled in below, from the catalogue — the term is matched over
        // it there, where the term is in scope.
        iptvChannels: [] as IPTVChannelResult[],
        jamendoTracks: (jamendoTracks.data as JamendoTrackResult[] | undefined) ?? [],
        internetArchiveItems:
          (internetArchiveItems.data as InternetArchiveItemResult[] | undefined) ?? [],
        audiusTracks: (audiusTracks.data as AudiusTrackResult[] | undefined) ?? [],
      },
      // The whole catalogue, kept out of `results` so the consumer never
      // sorts 11,543 channels to show six.
      iptvCatalogue: (iptvCatalogue.data as IPTVCatalogue | undefined) ?? null,
      isLoading:
        audiobooks.isFetching ||
        iptvCatalogue.isFetching ||
        jamendoTracks.isFetching ||
        internetArchiveItems.isFetching ||
        audiusTracks.isFetching,
    }),
  });

  // The term is matched over the cached catalogue — the same match the
  // Live TV screen makes, so a channel found here and a channel found
  // there agree.
  const iptvMatches = useMemo(
    () =>
      combined.iptvCatalogue
        ? filterIPTVChannels(combined.iptvCatalogue.channels, {
            term: debouncedQuery,
          }).slice(0, IPTV_RESULT_LIMIT)
        : [],
    [combined.iptvCatalogue, debouncedQuery],
  );

  // ── Trending (empty query) — real API data, no hardcoded lists (P40.7) ──
  const [trending, setTrending] = useState<JamendoTrackResult[]>([]);
  useEffect(() => {
    if (enabled) {
      setTrending([]);
      return;
    }
    let cancelled = false;
    getPopularJamendoTracks(10)
      .then(list => {
        if (!cancelled) setTrending(list);
      })
      .catch(() => {
        if (!cancelled) setTrending([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Loading is "any of the 5 sources is fetching, and we asked
  // them to fetch" — the per-source error isolation lives inside
  // `combine` (a failed source returns `[]`, the others still
  // render). The legacy 3-tier array-by-reference check against
  // a module-level `EMPTY` is gone.
  return {
    results: {...combined.results, iptvChannels: iptvMatches},
    isLoading: enabled && combined.isLoading,
    trending,
  };
}
