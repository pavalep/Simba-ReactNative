// ─── Podcasts Screen — useSearch (browse shell) ───────────────────────
// Owns the debounced search query + stale-echo guard. Co-located with
// `useOptions` and the screen's data hook — all three are siblings in
// `hooks/`.

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {SectionBrowseConfig} from '../types';

const DEFAULT_DEBOUNCE_MS = 300;

export interface SectionSearchState {
  query: string;
  setQuery: (text: string) => void;
  debouncedQuery: string;
  handleDebouncedChange: (text: string) => void;
  clear: () => void;
  active: boolean;
  debounceMs: number;
}

export function useSectionSearch(
  config: SectionBrowseConfig,
  routeParams?: Readonly<Record<string, unknown>>,
): SectionSearchState {
  const debounceMs = config.search?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const seedQuery = useMemo(() => {
    const p = routeParams as {query?: string} | undefined;
    return typeof p?.query === 'string' ? p.query : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams, config.route]);

  const [query, setQuery] = useState(seedQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(seedQuery);

  useEffect(() => {
    if (seedQuery !== query) {
      setQuery(seedQuery);
      setDebouncedQuery(seedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery]);

  const queryRef = useRef(query);
  queryRef.current = query;

  const handleDebouncedChange = useCallback((text: string) => {
    if (queryRef.current === text) setDebouncedQuery(text);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    handleDebouncedChange,
    clear,
    active: debouncedQuery.trim().length > 0,
    debounceMs,
  };
}