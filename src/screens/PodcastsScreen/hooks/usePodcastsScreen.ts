// ─── Podcasts Screen Hook ──────────────────────────────────────────────
// Manages category selection & search, fetches results from Podcast Index,
// and returns loading/error/data state.

import {useState, useEffect, useCallback, useRef} from 'react';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import {searchPodcasts} from '../../../services/api/podcastIndexService';
import {useDebounce} from '../../../hooks/useDebounce';
import type {PodcastResult} from '../../../types/api';

interface ResultsMap {
  [key: string]: PodcastResult[];
}

export function usePodcastsScreen(initialCategoryId?: number) {
  const [selectedCategory, setSelectedCategory] = useState<number>(
    initialCategoryId ?? PODCAST_CATEGORIES[0]?.id ?? 0,
  );
  const [results, setResults] = useState<ResultsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchByTerm = useCallback(
    async (term: string, key: string) => {
      if (results[key] || fetchingRef.current.has(key)) return;

      fetchingRef.current.add(key);
      setIsLoading(true);
      setError(null);

      try {
        const items = await searchPodcasts(term);
        setResults(prev => ({...prev, [key]: items}));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load podcasts',
        );
      } finally {
        fetchingRef.current.delete(key);
        setIsLoading(false);
      }
    },
    [results],
  );

  // Fetch when category or debounced search changes
  useEffect(() => {
    const activeSearch = debouncedSearch.trim();
    if (activeSearch) {
      const key = `search_${activeSearch.toLowerCase()}`;
      fetchByTerm(activeSearch, key);
    } else if (selectedCategory) {
      const category = PODCAST_CATEGORIES.find(c => c.id === selectedCategory);
      if (category) {
        const key = `cat_${category.id}`;
        fetchByTerm(category.name, key);
      }
    }
  }, [debouncedSearch, selectedCategory, fetchByTerm]);

  return {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  };
}
