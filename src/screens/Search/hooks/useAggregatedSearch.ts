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

import {useEffect, useState} from 'react';
import {useApiQueries} from '../../../hooks/useApiQuery';
import {searchAudiobooks} from '../../../infrastructure/api/librivox/adapter';
import {searchIPTVChannels} from '../../../infrastructure/api/iptv/adapter';
import {searchJamendoTracks} from '../../../infrastructure/api/jamendo/adapter';
import {searchInternetArchiveAudio} from '../../../infrastructure/api/internetArchive/adapter';
import {searchAudiusTracks} from '../../../infrastructure/api/audius/adapter';
import {getPopularJamendoTracks} from '../../../infrastructure/api/jamendo/adapter';
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
 * The other four sources each ask their API for six. The IPTV adapter
 * filters the first 500 channels client-side and returns every match,
 * so the count is applied to the RESULT here — the one place that owns
 * it.
 */
const IPTV_RESULT_LIMIT = 6;

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
        queryKey: ['iptv', 'search', debouncedQuery, IPTV_RESULT_LIMIT] as const,
        // IPTV-org has no search endpoint — the API returns the full
        // channel list and it is filtered client-side.
        //
        // 2026-11-12 (SEARCH_PAGE_REDESIGN): this used to call
        // `getAllIPTVChannels({limit: 6})`, which returns the FIRST SIX
        // CHANNELS OF THE WHOLE IPTV-ORG LIST, whatever was typed. The
        // comment below used to claim "the consumer filters by
        // `debouncedQuery` at the render layer" — and no consumer did.
        // So a search for "music" answered with six unrelated TV
        // channels under a "TV" heading.
        //
        // `searchIPTVChannels` is the adapter that does the filtering,
        // and it existed and was unused. It filters the first 500
        // channels by name / country / category and returns EVERY match
        // — its own `limit` applies to the fetch, not to the result —
        // so the result is sliced here, at the one place that owns it.
        queryFn: () =>
          searchIPTVChannels(debouncedQuery, {limit: IPTV_RESULT_LIMIT}).then(
            list => list.slice(0, IPTV_RESULT_LIMIT),
          ),
        enabled,
        staleTime: 60_000,
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
      iptvChannels,
      jamendoTracks,
      internetArchiveItems,
      audiusTracks,
    ]) => ({
      results: {
        podcasts: [], // Podcast Index uses SHA1 auth; excluded from raw aggregator
        radioStations: [], // Radio Browser needs name-based query; skipped here
        audiobooks: (audiobooks.data as AudiobookResult[] | undefined) ?? [],
        iptvChannels: (iptvChannels.data as IPTVChannelResult[] | undefined) ?? [],
        jamendoTracks: (jamendoTracks.data as JamendoTrackResult[] | undefined) ?? [],
        internetArchiveItems:
          (internetArchiveItems.data as InternetArchiveItemResult[] | undefined) ?? [],
        audiusTracks: (audiusTracks.data as AudiusTrackResult[] | undefined) ?? [],
      },
      isLoading:
        audiobooks.isFetching ||
        iptvChannels.isFetching ||
        jamendoTracks.isFetching ||
        internetArchiveItems.isFetching ||
        audiusTracks.isFetching,
    }),
  });

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
    results: combined.results,
    isLoading: enabled && combined.isLoading,
    trending,
  };
}
