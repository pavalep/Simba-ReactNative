// ─── v10: Shared Section Search ─────────────────────────────────────────
// Wave 2 (Phase 2.2). ONE search state per section, owned at the shell
// level so it survives tab switches (the user's search-persistence
// standard, v10 spec §3.3).
//
// Debounce ownership: SearchBar (core component) owns the debounce timer —
// its `value` tracks onChangeText (raw echo) and `onDebouncedChange` fires
// the debounced echo. This hook holds ONLY the state + the stale-echo guard,
// so there is no double-debounce and no double-fetch.
//
// Stale-echo guard: a debounced echo is only accepted when it still matches
// the latest raw keystroke. If the user typed past it, the echo is dropped —
// a newer `onDebouncedChange` will arrive with the final text.

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {
  SectionBrowseConfig,
  SectionRouteKey,
  SectionRouteParams,
} from '../sectionConfig';

const DEFAULT_DEBOUNCE_MS = 300;

export interface SectionSearchState {
  /** Raw (un-debounced) text driving the TextInput. */
  query: string;
  /** Set the raw text (SearchBar `onChangeText`). */
  setQuery: (text: string) => void;
  /** Debounced echo content renderers read (stable across tab switches). */
  debouncedQuery: string;
  /** Accept a debounced echo from SearchBar (drops stale echoes). */
  handleDebouncedChange: (text: string) => void;
  /** Clear the field + the debounced term. */
  clear: () => void;
  /** True when a non-empty term is actively filtering content. */
  active: boolean;
  /** Debounce ms from config (default 300) — handed to SearchBar. */
  debounceMs: number;
}

/**
 * Section-level search state. `config` supplies the debounce + the route
 * key (so re-seeding never leaks across sections); `routeParams` seeds the
 * field from the `query` preset used by Home shelves deep-links.
 */
export function useSectionSearch(
  config: SectionBrowseConfig,
  routeParams?: SectionRouteParams<SectionRouteKey>,
): SectionSearchState {
  const debounceMs = config.search.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  // Seed from the route `query` preset (Home shelves pre-fill a term).
  const seedQuery = useMemo(() => {
    const p = routeParams as {query?: string} | undefined;
    return typeof p?.query === 'string' ? p.query : '';
    // config.route: reset the field when the mounted section changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams, config.route]);

  const [query, setQuery] = useState(seedQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(seedQuery);

  // Re-seed when Home re-navigates with a different `query` preset.
  useEffect(() => {
    if (seedQuery !== query) {
      setQuery(seedQuery);
      setDebouncedQuery(seedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery]);

  // Latest raw text — the stale-echo guard compares against this.
  const queryRef = useRef(query);
  queryRef.current = query;

  const handleDebouncedChange = useCallback((text: string) => {
    // Drop stale echoes: a newer keystroke already moved `query` past this
    // text, so accepting it would resurrect an older term (Phase 2.2 error
    // fix — debounce races).
    if (queryRef.current === text) {
      setDebouncedQuery(text);
    }
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

// ─── TEMP dev-only regression harness (Phase 2.2 step 7) ────────────────
// Logs the raw → debounced echo per keystroke so the Movies preview can be
// compared against the legacy screen for the same input. Removed when all
// 8 sections have migrated.

export function logSearchComparison(
  route: string,
  raw: string,
  debounced: string,
): void {
  if (!__DEV__) return;
  console.log(`[v10:${route}] search "${raw}" → "${debounced}"`);
}
