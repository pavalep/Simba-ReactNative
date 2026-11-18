// ─── Live TV — the catalogue query ────────────────────────────────────
//
// THE ONE QUERY
// -------------
// The IPTV source publishes the WHOLE channel directory as one playlist
// (`index.category.m3u`) plus two small maps (`/api/categories.json`,
// `/api/countries.json`). There is no per-category or per-search
// endpoint, so there is nothing to scope on the wire.
//
// The catalogue is fetched ONCE, under the key `['iptv', 'catalogue']`, and
// everything after that is a filter over memory (see
// `src/infrastructure/api/iptv/catalogue.ts`).
//
// It used to be different, and the difference was expensive: the query key
// carried the category AND the search term, so EVERY scope change
// re-downloaded the directory — 1,047,201 bytes of `api/channels.json` on
// every keystroke, and a file with no stream URL in it, so every answer
// was rejected and every scope showed an error card.
//
// WHY THIS IS A SEPARATE HOOK
// ---------------------------
// Two callers need the catalogue: the screen's composition root (the
// categories become the filter axis) and the data hook (the channels
// become the rows). Both read it through THIS hook, so they read the SAME
// query — one cache entry, one download, two subscribers. TanStack Query
// dedupes the in-flight request, so the catalogue is fetched once even
// though two components ask for it.

import {useCallback, useMemo} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {
  getIPTVCatalogue,
  IPTV_RETRIES,
  type IPTVCatalogue,
} from '../../../infrastructure/api/iptv/adapter';
import type {IPTVCategory, IPTVChannelResult} from '../../../types/api';

/**
 * How long the catalogue stays fresh, and how long it stays in the cache.
 *
 * The catalogue is the WHOLE directory — 2.8 MB on the wire — so it is
 * fetched rarely: 30 minutes of freshness, and an hour in the cache after
 * the last screen stops watching it.
 *
 * The `gcTime` is the one that matters for the user: TanStack drops a
 * query after 5 minutes of nobody watching it by default, and that would
 * mean paying the 2.8 MB again on every visit.
 */
const CATALOGUE_STALE_MS = 30 * 60_000;
const CATALOGUE_GC_MS = 60 * 60_000;

export interface LiveTVCatalogueState {
  /** Every playable channel in the directory. */
  channels: IPTVChannelResult[];
  /**
   * The categories that ANSWER — the ones with at least one channel.
   *
   * The source serves 30 category ids and does NOT serve a channel count
   * (measured: 30 records, 0 occurrences of `channel_count`), so the count
   * is the app's own, computed from the catalogue. A category with no
   * channels under it is a filter that can only ever produce "No channels
   * found." — a control that cannot act must not occupy space.
   */
  categories: IPTVCategory[];
  /** The query has settled WITH DATA. */
  hasLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  /**
   * Run the catalogue again (the pull-to-refresh gesture's work).
   *
   * It returns the refetch's promise ON PURPOSE: the gesture's spinner is
   * cleared by that promise's `finally`, so a refetch that throws cannot
   * leave the spinner on (see `_shared/pullToRefresh.ts`).
   */
  refetch: () => Promise<unknown>;
}

export function useLiveTVCatalogue(): LiveTVCatalogueState {
  const query = useApiQuery<IPTVCatalogue>({
    queryKey: ['iptv', 'catalogue'],
    queryFn: ({signal}) => getIPTVCatalogue(signal),
    staleTime: CATALOGUE_STALE_MS,
    gcTime: CATALOGUE_GC_MS,
    retry: IPTV_RETRIES,
  });

  const channels = useMemo(
    () => query.data?.channels ?? [],
    [query.data],
  );

  const categories = useMemo(
    () => (query.data?.categories ?? []).filter(c => c.channelCount > 0),
    [query.data],
  );

  // TanStack's `refetch` is stable, so the callback is stable too — the
  // pull-to-refresh gesture reads it through a ref (`_shared/pullToRefresh.ts`)
  // and a fresh closure every render would be a fresh refetch every render.
  const refetch = useCallback(() => query.refetch(), [query.refetch]);

  return {
    channels,
    categories,
    // "The query has settled WITH DATA" — not "the query settled".
    // `!!data || !!error` is true when the FIRST page failed, and the
    // screen's failure branch tests `!hasLoaded`, so a failed load would
    // fall through every branch and render an EMPTY LIST: no message, no
    // spinner, no button.
    hasLoaded: !!query.data,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch,
  };
}
