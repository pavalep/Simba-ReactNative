// ─── Audiobooks Screen Hook ─────────────────────────────────────────
// Phase 37.1: browse LibriVox by search / genre / recent. Debounced
// search, genre chips, offline-aware auto-retry on reconnect.

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  searchAudiobooks,
  searchByGenre,
  getRecentAudiobooks,
} from '../../../services/api/librivoxService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {AudiobookResult} from '../../../types/api';

export type AudiobooksMode = 'search' | 'genres' | 'recent';

const BOOK_LIMIT = 30;

export function useAudiobooksScreen(initialTab?: string, initialGenre?: string) {
  const {isOnline} = useNetworkStatus();

  const [mode, setMode] = useState<AudiobooksMode>(
    (initialTab as AudiobooksMode) || 'search',
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    initialGenre ?? null,
  );
  const [books, setBooks] = useState<AudiobookResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef(false);
  const failedRef = useRef(false);

  // ── Book loading (search / genre / recent) ──
  const loadBooks = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const q = debouncedSearch.trim();
      let items: AudiobookResult[] = [];
      if (mode === 'search' && q) {
        items = await searchAudiobooks(q, {limit: BOOK_LIMIT});
      } else if (mode === 'genres' && selectedGenre) {
        items = await searchByGenre(selectedGenre, {limit: BOOK_LIMIT});
      } else if (mode === 'recent') {
        items = await getRecentAudiobooks({limit: BOOK_LIMIT});
      }
      setBooks(items);
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to load audiobooks');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, mode, selectedGenre]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // ── Auto-retry the failed query when connectivity returns ──
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedRef.current) {
      failedRef.current = false;
      loadBooks();
    }
  }, [isOnline, loadBooks]);

  const retry = useCallback(() => {
    setBooks([]);
    loadBooks();
  }, [loadBooks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  const handleModeChange = useCallback((next: AudiobooksMode) => {
    setMode(next);
    setSelectedGenre(null);
    setSearchQuery('');
  }, []);

  const handleGenreSelect = useCallback((genre: string) => {
    setSelectedGenre(prev => (prev === genre ? null : genre));
    setSearchQuery('');
  }, []);

  return {
    mode,
    setMode: handleModeChange,
    selectedGenre,
    setSelectedGenre: handleGenreSelect,
    books,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
  };
}
