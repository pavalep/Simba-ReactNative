// ─── Movies Screen Hook ─────────────────────────────────────────────────
// Manages category selection, fetches results from Internet Archive,
// and returns loading/error/data state.

import {useState, useEffect, useCallback, useRef} from 'react';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {searchInternetArchiveVideos} from '../../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../../types/api';

interface ResultsMap {
  [categoryId: string]: InternetArchiveVideoResult[];
}

export function useMoviesScreen(initialCategoryId?: string) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategoryId ?? MOVIE_CATEGORIES[0]?.id ?? '',
  );
  const [results, setResults] = useState<ResultsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchCategory = useCallback(async (categoryId: string) => {
    // Skip if already fetched or already fetching
    if (results[categoryId] || fetchingRef.current.has(categoryId)) return;

    const category = MOVIE_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    fetchingRef.current.add(categoryId);
    setIsLoading(true);
    setError(null);

    try {
      const items = await searchInternetArchiveVideos(category.query, {
        limit: 20,
      });
      setResults(prev => ({...prev, [categoryId]: items}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      fetchingRef.current.delete(categoryId);
      setIsLoading(false);
    }
  }, [results]);

  // Fetch initial category on mount and when selected changes
  useEffect(() => {
    if (selectedCategory) {
      fetchCategory(selectedCategory);
    }
  }, [selectedCategory, fetchCategory]);

  return {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
  };
}
