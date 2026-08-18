// ─── v10: Unified Section Browse — Options State ─────────────────────────
// Wave 3 (Phase 3.3). ONE options state per section, owned at the SHELL
// level so selections survive tab switches and stay in sync everywhere.
//
// v10.2 (Phase 4.3): the `filter` group is now MULTI-select. Each
// section can pick several values (e.g. Movies categories) and they
// `OR` together in the IA query. The `sort` and `view` groups stay
// single-select (they don't combine meaningfully).
//
// Data model:
//   • `filters[id]` is `string[]` — 0+ keys. Empty = cleared.
//   • `sort` and `view` are still scalar `string`.
//
// The sheet (Phase 3.2) is CONTROLLED: it reads `state` and writes
// through `setOption`. Exactly ONE source of truth, so the sheet, the
// FAB badge and every `renderTab` always see the same selection.

import {useCallback, useMemo, useState} from 'react';
import type {
  SectionBrowseConfig,
  SectionOptionGroupId,
  SectionOptionsMerged,
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
  /** Active filter selections per group id: `string[]` (0+ keys). */
  filters: Record<string, string[]>;
  /** Sort key (undefined = natural order). */
  sort?: string;
  /** View density key ('grid' default). */
  view: string;
}

export interface SectionOptionsApi {
  state: SectionOptionsState;
  /**
   * Set an option for a group id.
   *   • 'filter' group: pass the full new keys array (multi-select).
   *   • 'sort' / 'view': pass a single key string.
   */
  setOption(groupId: 'filter', keys: string[]): void;
  setOption(groupId: 'sort' | 'view', key: string): void;
  /** Clear every option back to defaults (the sheet's "Reset" row). */
  reset: () => void;
  /** Total number of active filter chips — the FAB badge. */
  activeFilterCount: number;
  /**
   * Merged record for `SectionRenderContext.options` (a
   * `SectionOptionsMerged`): `filter` is the selected keys array,
   * `sort` / `view` are scalars. Renderers read only this.
   */
  options: SectionOptionsMerged;
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

  // Route-param filter seed (Home deep-links). Only honored when the
  // value is a real option in this section's FILTER group — a stale
  // /typo'd param silently falls back to the default "All" stream.
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

  // Resolve the FILTER group id from config — sections sometimes call
  // it 'filter', 'category', 'genre', etc. We find the first group
  // marked as filter, falling back to the literal 'filter'.
  const filterGroupId =
    config.options?.groups?.find(g => g.id === 'filter')?.id ?? 'filter';

  // In-memory per-section state — fresh on mount.
  const [state, setState] = useState<SectionOptionsState>(() => ({
    filters: seedFilterKey ? {[filterGroupId]: [seedFilterKey]} : {},
    sort: undefined,
    view: defaultView,
  }));

  // `setOption` accepts either a multi-select keys array (filter
  // group) or a single key (sort / view). Implementation uses
  // functional updates only — it never reads a stale `state` closure,
  // so rapid mid-fetch changes always apply on the current state.
  const setOption = useCallback(
    (groupId: SectionOptionGroupId, value: string | string[]): void => {
      setState(prev => {
        let next: SectionOptionsState;
        if (groupId === 'sort') {
          next = {...prev, sort: value as string};
        } else if (groupId === 'view') {
          next = {...prev, view: value as string};
        } else {
          // 'filter' — replace the entire group with the new keys array.
          // Multi-select: empty array clears the group.
          const keys = value as string[];
          next = {
            ...prev,
            filters: keys.length === 0
              ? Object.fromEntries(
                  Object.entries(prev.filters).filter(
                    ([id]) => id !== groupId,
                  ),
                )
              : {...prev.filters, [groupId]: keys},
          };
        }
        if (__DEV__) {
          console.log(
            `[v10][useSectionOptions] ${config.route}: ${groupId} →`,
            JSON.stringify(value),
          );
        }
        return next;
      });
    },
    [config.route],
  );

  const reset = useCallback(() => {
    setState(() => {
      if (__DEV__) {
        console.log(`[v10][useSectionOptions] ${config.route}: reset → defaults`);
      }
      return {filters: {}, sort: undefined, view: defaultView};
    });
  }, [config.route, defaultView]);

  // Derived: the active filter keys (collapsed across all filter groups,
  // but in practice there's only one filter group per section today).
  // Active filter count = total selected filter keys (multi-select)
  // plus 1 if a sort is active (sort badge counts too).
  const activeFilterCount = useMemo(() => {
    const filterCount = Object.values(state.filters).reduce(
      (sum, keys) => sum + keys.length,
      0,
    );
    return state.sort ? filterCount + 1 : filterCount;
  }, [state]);

  // Merged record for `SectionRenderContext.options` (a
  // `SectionOptionsMerged`). `filters` only ever holds the multi-select
  // FILTER group, so its selected keys collapse into `merged.filter`;
  // `sort` / `view` stay scalars. Empty groups are omitted entirely —
  // renderers treat a missing key as the default stream.
  const options = useMemo<SectionOptionsMerged>(() => {
    const filterKeys = state.filters[filterGroupId];
    const merged: SectionOptionsMerged = {};
    if (filterKeys && filterKeys.length > 0) {
      merged.filter = filterKeys;
    }
    if (state.sort) merged.sort = state.sort;
    if (state.view) merged.view = state.view;
    return merged;
  }, [state, filterGroupId]);

  return {state, setOption, reset, activeFilterCount, options};
}