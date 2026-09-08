// ─── Music Screen — useSectionOptions ─────────────────────────────────
// Per-screen copy of the v10 useSectionOptions hook. Owns the runtime
// shape of the FAB options sheet (multi-select filters + sort + view).

import {useCallback, useMemo, useState} from 'react';
import type {
  SectionBrowseConfig,
  SectionOptionGroupId,
  SectionOptionsMerged,
} from '../types';

const DEFAULT_VIEW = 'grid';

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
  view: string;
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
  config: SectionBrowseConfig,
  routeParams?: Readonly<Record<string, unknown>>,
): SectionOptionsApi {
  const defaultView =
    config.options?.groups?.find(g => g.id === 'view')?.options?.[0]?.key ??
    DEFAULT_VIEW;

  const seedFilterKey = useMemo<string | undefined>(() => {
    if (!routeParams) return undefined;
    const filterOptions =
      config.options?.groups?.find(g => g.id === 'filter')?.options ?? [];
    const validKeys = new Set(filterOptions.map(o => o.key));
    for (const param of FILTER_SEED_PARAMS) {
      const value = (routeParams as Record<string, unknown>)[param];
      if (typeof value === 'string' && validKeys.has(value)) return value;
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
                ? Object.fromEntries(Object.entries(prev.filters).filter(([id]) => id !== groupId))
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
      (sum, keys) => sum + keys.length, 0);
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
