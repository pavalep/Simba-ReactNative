// ─── Archive Screen Hook ────────────────────────────────────────────────
// V18.11.1: converted from the v3-v9 "TabView" pattern to the v10+
// "single content stream + FAB" pattern. Two useApiQuery calls (one
// per media type) — the active type's query result is returned; the
// screen owns the `mediatype` state and switches via a FAB.
//
// V18.2 lesson: "1 useApiQuery per service method." Audio and video
// are two distinct service methods (searchInternetArchiveAudio vs
// searchInternetArchiveVideos) with different return shapes, so the
// hook runs them as parallel queries and exposes whichever is active.
// No per-scope Map<key, ScopeState> cache; TanStack's queryKey cache
// is the only cache.

import {useCallback, useMemo, useState} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {
  searchInternetArchiveAudio,
  searchInternetArchiveVideos,
} from '../../../services/api/internetArchiveAdapter';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../types/api';

export type ArchiveMediaType = 'audio' | 'video';

const PAGE_SIZE = 20;
const DEFAULT_AUDIO_QUERY = 'old time radio';
const DEFAULT_VIDEO_QUERY = 'classic films';

export interface UseArchiveScreenParams {
  initialTab?: ArchiveMediaType;
  initialQuery?: string;
}

export interface UseArchiveScreenResult {
  // media-type FAB state
  mediaType: ArchiveMediaType;
  setMediaType: (t: ArchiveMediaType) => void;
  // search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  // active stream
  items: InternetArchiveItemResult[] | InternetArchiveVideoResult[];
  numFound: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  // actions
  fetchNextPage: () => void;
  refetch: () => void;
  // connectivity
  isOnline: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
}

export function useArchiveScreen({
  initialTab,
  initialQuery,
}: UseArchiveScreenParams = {}): UseArchiveScreenResult {
  const {isOnline} = useNetworkStatus();

  const [mediaType, setMediaType] = useState<ArchiveMediaType>(initialTab ?? 'audio');
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [searchTerm, setSearchTerm] = useState(initialQuery ?? '');

  const isSearchActive = searchTerm.trim().length > 0;
  const query = searchTerm.trim() || (mediaType === 'audio' ? DEFAULT_AUDIO_QUERY : DEFAULT_VIDEO_QUERY);
  const page = 1; // page-1 query; load-more is handled by re-fetching with a higher page

  const audioQ = useApiQuery<PaginatedResult<InternetArchiveItemResult>>({
    queryKey: ['archive', 'audio', query, page],
    queryFn: () =>
      searchInternetArchiveAudio(query, {limit: PAGE_SIZE, page}),
    enabled: mediaType === 'audio',
    staleTime: 600_000,
  });

  const videoQ = useApiQuery<PaginatedResult<InternetArchiveVideoResult>>({
    queryKey: ['archive', 'video', query, page],
    queryFn: () =>
      searchInternetArchiveVideos(query, {limit: PAGE_SIZE, page}),
    enabled: mediaType === 'video',
    staleTime: 600_000,
  });

  const active = mediaType === 'audio' ? audioQ : videoQ;

  const items = useMemo(
    () => active.data?.items ?? [],
    [active.data],
  );

  const handleRefresh = useCallback(() => {
    void active.refetch();
  }, [active]);

  return {
    mediaType,
    setMediaType,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    items,
    numFound: active.data?.numFound ?? 0,
    hasLoaded: !!active.data,
    isLoading: active.isFetching,
    isLoadingMore: false, // IA is single-page in this screen
    hasNextPage: false,
    error: active.error?.message ?? null,
    fetchNextPage: () => {}, // IA page-1 only; navigation handles pagination elsewhere
    refetch: () => {
      void active.refetch();
    },
    isOnline,
    refreshing: active.isFetching && !!active.data,
    handleRefresh,
  };
}
