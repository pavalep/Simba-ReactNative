// ─── Archive Screen Hook ───────────────────────────────────────────────
// Phase 37.4: browse Internet Archive audio + video by search. Tabs
// switch the mediatype; quick-search chips seed real queries.

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  searchInternetArchiveAudio,
  searchInternetArchiveVideos,
} from '../../../services/api/internetArchiveService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../../types/api';

export type ArchiveTab = 'audio' | 'video';

const RESULT_LIMIT = 20;

const DEFAULT_AUDIO_QUERY = 'old time radio';
const DEFAULT_VIDEO_QUERY = 'classic films';

export function useArchiveScreen(initialTab?: ArchiveTab, initialQuery?: string) {
  const {isOnline} = useNetworkStatus();

  const [tab, setTab] = useState<ArchiveTab>(initialTab ?? 'audio');
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [audioResults, setAudioResults] = useState<InternetArchiveItemResult[]>([]);
  const [videoResults, setVideoResults] = useState<InternetArchiveVideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef(false);
  const failedRef = useRef(false);

  const effectiveQuery = debouncedSearch.trim() || (tab === 'audio' ? DEFAULT_AUDIO_QUERY : DEFAULT_VIDEO_QUERY);

  const loadResults = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'audio') {
        const items = await searchInternetArchiveAudio(effectiveQuery, {
          limit: RESULT_LIMIT,
        });
        setAudioResults(items);
      } else {
        const items = await searchInternetArchiveVideos(effectiveQuery, {
          limit: RESULT_LIMIT,
        });
        setVideoResults(items);
      }
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to load archive results');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [tab, effectiveQuery]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // ── Auto-retry the failed query when connectivity returns ──
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedRef.current) {
      failedRef.current = false;
      loadResults();
    }
  }, [isOnline, loadResults]);

  const retry = useCallback(() => {
    setAudioResults([]);
    setVideoResults([]);
    loadResults();
  }, [loadResults]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  const handleTabChange = useCallback((next: ArchiveTab) => {
    setTab(next);
  }, []);

  return {
    tab,
    setTab: handleTabChange,
    searchQuery,
    setSearchQuery,
    audioResults,
    videoResults,
    isLoading,
    error,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
  };
}
