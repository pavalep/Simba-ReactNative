// ─── Aggregated Remote Search Hook ──────────────────────────────────────
// P40.1/40.3/40.6: runs the debounced query through searchAggregator
// (allSettled → one failed API never blanks the page) with stale-request
// cancellation; exposes per-source slices + loading. Also serves trending
// tracks (P40.7) from real API data when the query is empty.

import {useEffect, useRef, useState} from 'react';
import {aggregateSearch} from '../../../services/api/searchAggregator';
import {getPopularJamendoTracks} from '../../../services/api/jamendoService';
import type {
  AggregatedSearchResults,
  JamendoTrackResult,
} from '../../../types/api';

const EMPTY: AggregatedSearchResults = {
  podcasts: [],
  radioStations: [],
  audiobooks: [],
  iptvChannels: [],
  jamendoTracks: [],
  internetArchiveItems: [],
  audiusTracks: [],
};

export interface AggregatedSearch {
  results: AggregatedSearchResults;
  isLoading: boolean;
  trending: JamendoTrackResult[];
}

export function useAggregatedSearch(
  query: string,
  debounceMs: number = 450,
): AggregatedSearch {
  const [results, setResults] = useState<AggregatedSearchResults>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [trending, setTrending] = useState<JamendoTrackResult[]>([]);
  const requestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remote results for the debounced query
  useEffect(() => {
    const trimmed = query.trim();
    requestRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!trimmed) {
      setResults(EMPTY);
      setIsLoading(false);
      return;
    }
    const id = requestRef.current;
    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await aggregateSearch(trimmed, {limit: 6});
        if (requestRef.current === id) setResults(data);
      } catch {
        if (requestRef.current === id) setResults(EMPTY);
      } finally {
        if (requestRef.current === id) setIsLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  // Trending (empty query) — real API data, no hardcoded lists (P40.7)
  useEffect(() => {
    if (query.trim()) {
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
  }, [query]);

  return {results, isLoading, trending};
}
