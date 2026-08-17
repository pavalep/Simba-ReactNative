// ─── v10: Unified Section Browse — Options State ─────────────────────────
// Wave 3 (Phase 3.3). ONE options state per section, owned at the SHELL
// level so selections survive tab switches and stay in sync everywhere.
//
// The sheet (Phase 3.2) is CONTROLLED: it reads `options` — the same
// record merged into `SectionRenderContext.options` — and writes through
// `setOption`. Exactly ONE source of truth, so the sheet, the FAB badge
// and every `renderTab` always see the same selection (Wave 4 FilterChips
// read/write this same record).
//
// In-memory per-section state: fresh on mount. Radio-favorites keep their
// own hook persistence — merging that is explicitly out of scope.

import {useCallback, useMemo, useState} from 'react';
import type {
  SectionBrowseConfig,
  SectionOptionGroupId,
  SectionRouteKey,
  SectionRouteParams,
} from '../sectionConfig';

const DEFAULT_VIEW = 'grid';

/** Route params that pre-select the FILTER group (Home deep-links).
 *  Sections name the same intent differently — try them in order. */
const FILTER_SEED_PARAMS = [
  'genre',
  'categoryId',
  'initialTab',
  'initialGenre',
  'initialTag',
] as const;

export interface SectionOptionsState {
  /** Active filter selections: filterKey → subKey (Wave 4 chips may hold several). */
  filters: Record<string, string | undefined>;
  /** Sort key (undefined = natural order). */
  sort?: string;
  /** View density key ('grid' default). */
  view: string;
}

export interface SectionOptionsApi {
  state: SectionOptionsState;
  /** Set one option for a group id ('filter' | 'sort' | 'view'). */
  setOption: (groupId: SectionOptionGroupId, key: string) => void;
  /** Clear every option back to defaults (the sheet's one-tap "Reset" row). */
  reset: () => void;
  /** Number of active (non-default) option selections — the FAB badge. */
  activeFilterCount: number;
  /** Merged record for `SectionRenderContext.options` — renderTab reads only this. */
  options: Partial<Record<SectionOptionGroupId, string>>;
}

export function useSectionOptions(
  config: SectionBrowseConfig,
  routeParams?: SectionRouteParams<SectionRouteKey>,
): SectionOptionsApi {
  // Default view: the config's view group normally leads with the grid
  // option — derive it from the config (step 2), falling back to 'grid'.
  const defaultView =
    config.options?.groups?.find(g => g.id === 'view')?.options?.[0]?.key ??
    DEFAULT_VIEW;

  // Route-param filter seed (Home deep-links). Only honored when the value
  // is a real option in this section's FILTER group — a stale/typo'd param
  // silently falls back to the default "All" stream.
  const seedFilterKey = useMemo<string | undefined>(() => {
    if (!routeParams) return undefined;
    const filterOptions =
      config.options?.groups?.find(g => g.id === 'filter')?.options ?? [];
    const validKeys = new Set(filterOptions.map(o => o.key));
    for (const param of FILTER_SEED_PARAMS) {
      const value = (routeParams as Record<string, unknown>)[param];
      if (typeof value === 'string' && validKeys.has(value)) {
        return value;
      }
    }
    return undefined;
  }, [routeParams, config.options]);

  // In-memory per-section state — fresh on mount (step 3).
  const [state, setState] = useState<SectionOptionsState>(() => ({
    filters: seedFilterKey ? {[seedFilterKey]: seedFilterKey} : {},
    sort: undefined,
    view: defaultView,
  }));

  // ── Setters (step 8 error fix) ─────────────────────────────────────────
  // `setOption`/`reset` use FUNCTIONAL updates only: they are stable
  // identities and can never read a stale `state` closure — every write
  // derives from the latest committed state, so options changing mid-fetch
  // are always applied on the current state, never a captured one.
  const setOption = useCallback(
    (groupId: SectionOptionGroupId, key: string) => {
      setState(prev => {
        let next: SectionOptionsState;
        if (groupId === 'sort') {
          next = {...prev, sort: key};
        } else if (groupId === 'view') {
          next = {...prev, view: key};
        } else {
          // filter group — single-select within the sheet: a new filter key
          // REPLACES the previous one, and tapping the ALREADY-ACTIVE option
          // clears the filter back to the default "All" stream (the chip is
          // feedback, not navigation — tap the chip to re-open the sheet).
          const current = prev.filters[key];
          next =
            current !== undefined
              ? {...prev, filters: {}}
              : {...prev, filters: {[key]: key}};
        }
        // Dev-only transition log (step 7) — removed before ship.
        if (__DEV__) {
          console.log(`[v10][useSectionOptions] ${config.route}: ${groupId} → ${key}`);
        }
        return next;
      });
    },
    [config.route],
  );

  const reset = useCallback(() => {
    setState(() => {
      // Dev-only transition log (step 7) — removed before ship.
      if (__DEV__) {
        console.log(`[v10][useSectionOptions] ${config.route}: reset → defaults`);
      }
      return {filters: {}, sort: undefined, view: defaultView};
    });
  }, [config.route, defaultView]);

  // ── Derived (step 8 error fix) ─────────────────────────────────────────
  // Both values recompute on EVERY state change via useMemo over the live
  // `state` dep — never memoized against a stale closure, so a badge that
  // must update on every setOption always reflects the current record.
  const options = useMemo<Partial<Record<SectionOptionGroupId, string>>>(() => {
    const merged: Partial<Record<SectionOptionGroupId, string>> = {};
    const filterKey = Object.keys(state.filters).find(
      k => state.filters[k] !== undefined,
    );
    if (filterKey) merged.filter = filterKey;
    if (state.sort) merged.sort = state.sort;
    if (state.view) merged.view = state.view;
    return merged;
  }, [state]);

  // `view` is a layout preference, not a filter — the badge counts
  // filters + sort only (step 4).
  const activeFilterCount = useMemo(() => {
    let count = Object.keys(state.filters).filter(
      k => state.filters[k] !== undefined,
    ).length;
    if (state.sort) count += 1;
    return count;
  }, [state]);

  return {state, setOption, reset, activeFilterCount, options};
}
