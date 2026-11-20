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
  // The All Audio page's own scope: the Artist screen sends
  // `filter: artistName` for its "view all tracks", and the page's
  // ARTIST group is where that name belongs. It was read by the hook
  // before the page joined the grammar, which meant the filter was
  // invisible — the list answered a question the page never showed.
  'filter',
] as const;

/**
 * The route params that seed the single-valued `sort` group.
 *
 * The All Audio page's route declares `sort?: string` and the Library
 * sends `sort: 'artist'` for its "View All Artists". The page has a
 * SORT group, so the param belongs to it — and the group is the only
 * place a sort can live now that the page's own header button is gone.
 */
const SORT_SEED_PARAMS = ['sort'] as const;

export interface SectionOptionsState {
  filters: Record<string, string[]>;
  sort?: string;
  /**
   * The view mode — the EXPLICIT selection.
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
   *
   * It is UNDEFINED until the user picks one. A group that merely sits
   * at its default has no explicit selection, so the sheet folds the
   * default in itself and the "RESET FILTERS" footer stays away — the
   * same rule the `sort` group follows. The EFFECTIVE value (the
   * explicit one, or the config's default) is what `options.view`
   * carries.
   */
  view?: string;
}

export interface SectionOptionsApi {
  state: SectionOptionsState;
  /**
   * Set a filter group's selection.
   *
   * The group id is the group's OWN id, so a screen with more than one
   * filter axis — the Radio screen has three — can hold them
   * independently: `setOption('genre', ['Rock'])` and
   * `setOption('country', ['US'])` are two different groups.
   */
  setOption(groupId: string, keys: string[]): void;
  /** Set the single-valued `sort` or `view` selection. */
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
  //
  // The DEFAULT belongs to the config (`defaultKey`), and the state's
  // `view` is the user's EXPLICIT choice. The sheet folds the default
  // in when there is no explicit selection, so a page that has never
  // been touched shows its default as the applied option without
  // counting as an active filter.
  const viewGroup = config.options?.groups?.find(g => g.id === 'view');
  const defaultView = viewGroup?.defaultKey ?? viewGroup?.options?.[0]?.key;
  // The sort group's default, for the same reason.
  const sortGroup = config.options?.groups?.find(g => g.id === 'sort');
  const defaultSort = sortGroup?.defaultKey;

  /**
   * The route param that seeds a filter, and the GROUP it seeds.
   *
   * The group matters as soon as a screen has more than one axis: the
   * Radio screen's `genre` param belongs in the genre group, and a
   * single flat `filter` array could not say so.
   */
  const seedFilter = useMemo<{groupId: string; key: string} | undefined>(() => {
    if (!routeParams) return undefined;
    // ANY filter group can be seeded — not only the one whose id is
    // 'filter'. A screen with more than one axis (Radio: genre, country,
    // language) names its groups after the axis, and the route param
    // that names one of them must reach it.
    const filterGroups = (config.options?.groups ?? []).filter(
      g => g.id !== 'sort' && g.id !== 'view',
    );
    for (const param of FILTER_SEED_PARAMS) {
      const value = (routeParams as Record<string, unknown>)[param];
      // The route param and the filter key are both the category's id,
      // but not always in the same TYPE: a route may declare
      // `categoryId?: number` while its filter keys are strings ('1',
      // '10', …). Comparing only strings made the seeding unreachable
      // for every numeric route — the param was declared and then
      // ignored.
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const key = String(value);
      for (const group of filterGroups) {
        // The match is CASE-INSENSITIVE, and the group's own spelling
        // is the one that is kept.
        //
        // A caller that sends `filter: 'kavinsky'` for the artist the
        // library knows as "Kavinsky" is naming the same artist, and a
        // filter that silently failed to apply is worse than one that
        // applies. The group keeps its own casing so the chip strip and
        // the sheet do not grow a second copy of the same option.
        const match = group.options.find(
          o => o.key.toLowerCase() === key.toLowerCase(),
        );
        if (match) return {groupId: group.id, key: match.key};
      }
    }
    return undefined;
  }, [routeParams, config.options]);

  /**
   * The route param that seeds the `sort` group.
   *
   * It is seeded only when the config declares a sort group and the
   * param is one of its keys — the same rule the filter seed follows.
   */
  const seedSort = useMemo<string | undefined>(() => {
    const sortGroup = config.options?.groups?.find(g => g.id === 'sort');
    if (!sortGroup || !routeParams) return undefined;
    for (const param of SORT_SEED_PARAMS) {
      const value = (routeParams as Record<string, unknown>)[param];
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const key = String(value);
      const match = sortGroup.options.find(
        o => o.key.toLowerCase() === key.toLowerCase(),
      );
      if (match) return match.key;
    }
    return undefined;
  }, [routeParams, config.options]);

  const filterGroupId =
    config.options?.groups?.find(g => g.id === 'filter')?.id ?? 'filter';

  const [state, setState] = useState<SectionOptionsState>(() => ({
    filters: seedFilter ? {[seedFilter.groupId]: [seedFilter.key]} : {},
    // The route's `sort` param seeds the sort group; the view has no
    // route param and starts at the config's default (which the
    // EFFECTIVE value below carries).
    sort: seedSort,
    view: undefined,
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
    // The reset returns every group to its DEFAULT, and a default is
    // not an explicit selection — so the state is empty and the
    // effective values come from the config.
    setState(() => ({filters: {}, sort: undefined, view: undefined}));
  }, []);

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
    // The EFFECTIVE sort and view: the user's explicit choice, or the
    // config's default. The content reads these, so the default lives
    // in ONE place — the config — instead of being repeated as a
    // literal in every screen that reads it.
    if (state.sort || defaultSort) merged.sort = state.sort || defaultSort;
    if (state.view || defaultView) merged.view = state.view || defaultView;
    // EVERY group's selection, by group id — so a screen with more than
    // one filter axis can read its own axis out of the context.
    if (Object.keys(state.filters).length > 0) merged.filters = state.filters;
    return merged;
  }, [state, filterGroupId, defaultSort, defaultView]);

  return {state, setOption, reset, activeFilterCount, options};
}
