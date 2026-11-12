// ─── Shared Section Options Hook (V20.8) ──────────────────────────────
// Lifted from the 3 per-screen copies that lived at
// `src/screens/{MusicScreen,MoviesScreen,PodcastsScreen}/hooks/useOptions.ts`.
// All 3 were character-for-character identical (modulo whitespace
// in one branch of the Podcasts copy); the lift collapses ~330 lines
// into ~110.
//
// Per-screen `BrowseLayout` consumers and `index.tsx` entry points
// now import `useSectionOptions` and `SectionOptionsApi` from this
// single shared module. The returned shape is unchanged.

import {useCallback, useMemo, useState} from 'react';
import type {SectionBrowseConfigOptions} from '../screens/_shared/sectionBrowseConfig';
import type {
  SectionOptionGroupId,
  SectionOptionsMerged,
} from '../screens/_shared/sectionOptions';

const FILTER_SEED_PARAMS = [
  'genre',
  'categoryId',
  'initialTab',
  'initialGenre',
  'initialTag',
] as const;

export interface SectionOptionsState {
  filters: Record<string, string[]>;
  sort?: string;
  /**
   * The view mode — `undefined` unless the screen's config actually
   * declares a `view` group.
   *
   * It used to default to `'grid'` for every screen, which had two
   * consequences and neither of them was intended:
   *
   *   1. the filter sheet's value always carried `view: ['grid']`, so
   *      the sheet's "RESET FILTERS" footer — which appears when
   *      anything is active — was **permanently visible** on every
   *      browse screen, even with no filter and no sort chosen;
   *   2. the Movies sheet offered a "View: Grid / List" group that
   *      **nothing read**: the grid is hard-coded `numColumns={2}`.
   *
   * The group is now declared only where it is used, and the state
   * follows the config.
   */
  view?: string;
}

export interface SectionOptionsApi {
  state: SectionOptionsState;
  setOption(groupId: 'filter', keys: string[]): void;
  setOption(groupId: 'sort' | 'view', key: string): void;
  reset: () => void;
  activeFilterCount: number;
  options: SectionOptionsMerged;
}

export function useSectionOptions(
  config: SectionBrowseConfigOptions,
  routeParams?: Readonly<Record<string, unknown>>,
): SectionOptionsApi {
  // The view mode exists only where the config declares a `view` group.
  const viewGroup = config.options?.groups?.find(g => g.id === 'view');
  const defaultView = viewGroup?.options?.[0]?.key;

  const seedFilterKey = useMemo<string | undefined>(() => {
    if (!routeParams) return undefined;
    const filterOptions =
      config.options?.groups?.find(g => g.id === 'filter')?.options ?? [];
    const validKeys = new Set(filterOptions.map(o => o.key));
    for (const param of FILTER_SEED_PARAMS) {
      const value = (routeParams as Record<string, unknown>)[param];
      // The route param and the filter key are both the category's id,
      // but not always in the same TYPE: `PodcastsScreen` declares
      // `categoryId?: number` while its filter keys are strings ('1',
      // '10', …). Comparing only strings made the seeding unreachable
      // for every numeric route — the param was declared and then
      // ignored.
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const key = String(value);
      if (validKeys.has(key)) return key;
    }
    return undefined;
  }, [routeParams, config.options]);

  const filterGroupId =
    config.options?.groups?.find(g => g.id === 'filter')?.id ?? 'filter';

  const [state, setState] = useState<SectionOptionsState>(() => ({
    filters: seedFilterKey ? {[filterGroupId]: [seedFilterKey]} : {},
    sort: undefined,
    view: defaultView,
  }));

  const setOption = useCallback(
    (groupId: SectionOptionGroupId, value: string | string[]): void => {
      setState(prev => {
        let next: SectionOptionsState;
        if (groupId === 'sort') next = {...prev, sort: value as string};
        else if (groupId === 'view') next = {...prev, view: value as string};
        else {
          const keys = value as string[];
          next = {
            ...prev,
            filters:
              keys.length === 0
                ? Object.fromEntries(
                    Object.entries(prev.filters).filter(
                      ([id]) => id !== groupId,
                    ),
                  )
                : {...prev.filters, [groupId]: keys},
          };
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState(() => ({filters: {}, sort: undefined, view: defaultView}));
  }, [defaultView]);

  const activeFilterCount = useMemo(() => {
    const filterCount = Object.values(state.filters).reduce(
      (sum, keys) => sum + keys.length,
      0,
    );
    return state.sort ? filterCount + 1 : filterCount;
  }, [state]);

  const options = useMemo<SectionOptionsMerged>(() => {
    const filterKeys = state.filters[filterGroupId];
    const merged: SectionOptionsMerged = {};
    if (filterKeys && filterKeys.length > 0) merged.filter = filterKeys;
    if (state.sort) merged.sort = state.sort;
    if (state.view) merged.view = state.view;
    return merged;
  }, [state, filterGroupId]);

  return {state, setOption, reset, activeFilterCount, options};
}
