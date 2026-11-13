// ─── Section Browse Layout (the ONE browse shell) ─────────────────────
//
// Music, Movies and Podcasts are the same page with different content:
// a header, a search field, a strip of the ACTIVE filters, the content
// itself, the filter FAB and the filter sheet.
//
// Until 2026-11-12 that shell existed in THREE copies:
//   src/screens/MusicScreen/components/BrowseLayout.tsx
//   src/screens/MoviesScreen/components/BrowseLayout.tsx
//   src/screens/PodcastsScreen/components/BrowseLayout.tsx
// The Music and the Movies copies were character-for-character identical
// apart from a comment; the Podcasts copy added one effect. Three copies
// meant three places to fix one bug, and the wave's audit found exactly
// that: the Movies' dead "View" group, the permanently visible RESET
// FILTERS footer and the disagreeing left gutters were each live in one
// copy and inherited by the others.
//
// This file is the shell. The three screens import it; there is no
// per-screen copy any more.
//
// THE GUTTER
// ----------
// One gutter: `spacing.lg` (16 dp). The chip strip used to carry the
// gutter TWICE — the slot's own `paddingHorizontal: spacing.md` (12)
// plus the `FilterChips` row's own 12 — so the first chip started 24 dp
// from the edge while the search field above it started 12. The
// `FilterChips` component is shared app-wide, so the row's own padding
// is overridden HERE rather than changed there; the other five screens
// that use it keep their own gutter.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {FilterChips, type FilterChipItem} from '../../components/utility/FilterChips';
import {Fab} from '../../components/core/Fab/Fab';
import {FilterSheet, type FilterSheetGroup} from '../../components/sheets/FilterSheet/FilterSheet';
import {useSectionSearch} from '../../hooks/useSectionSearch';
import type {SectionOptionsApi} from '../../hooks/useSectionOptions';
import type {SectionBrowseConfig} from './sectionBrowseConfig';
import type {SectionRenderContext} from './sectionRenderContext';
import type {SectionRouteKey, SectionRouteParams} from './sectionRoute';

interface Props {
  config: SectionBrowseConfig;
  optionsApi: SectionOptionsApi;
  routeParams: SectionRouteParams<SectionRouteKey>;
  /**
   * Some sources cannot answer a search term AND a filter at the same
   * time. The Podcast Index's `/search/byterm` takes `q` but no `cat`,
   * and its category endpoints take `cat` but no `q`, so the two cannot
   * be combined — the category would be silently ignored.
   *
   * When this is on, the category filter is cleared ONCE, the moment a
   * term first arrives, so the user is never left with a filter that
   * looks applied and is not. It is deliberately NOT re-applied on every
   * change of the filter: the pre-fix effect listed the filter count in
   * its dependencies, so picking a category while searching wiped it
   * again on the next render and the filter could never be used at all
   * (B10-2).
   */
  autoClearFilterOnSearch?: boolean;
  /**
   * The symmetric rule, for the same reason: a category picked WHILE a
   * term is on screen clears the term.
   *
   * Without it the two rules only covered half the problem. A term
   * cleared the category, but a category picked afterwards stuck in the
   * chip strip while the source went on answering the term alone — the
   * filter looked applied and was not, which is exactly what the rule
   * above exists to prevent. Together the two rules give the Podcasts
   * scope ONE source of truth: the scope is either a term or a
   * category, never both, and the last thing the user chose is the one
   * that applies.
   */
  autoClearSearchOnFilter?: boolean;
}

export const BrowseLayout: React.FC<Props> = ({
  config,
  optionsApi,
  routeParams,
  autoClearFilterOnSearch = false,
  autoClearSearchOnFilter = false,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {isOnline} = useNetworkStatus();

  const search = useSectionSearch(config, routeParams);

  const hasOptions = !!config.options?.groups?.length;
  const [sheetVisible, setSheetVisible] = useState(false);
  const {state, setOption, reset, activeFilterCount, options} = optionsApi;

  /**
   * Is the list finished and sitting at its end?
   *
   * When it is, the floating filter button has nothing left to float
   * over: it sits in the corner the "You're all caught up" line leaves,
   * and the bottom of the screen reads as clutter. The owner's call
   * (2026-11-13) is that the button gets out of the way there — and comes
   * back the moment the user scrolls up, because the button is the list's
   * filter affordance and hiding it from the whole screen would remove
   * the action.
   */
  const [atListEnd, setAtListEnd] = useState(false);
  const reportAtListEnd = useCallback((atEnd: boolean) => {
    setAtListEnd(atEnd);
  }, []);

  // `activeChips` is computed here (not in ctx) and fed directly to the
  // <FilterChips> strip — keeping the ctx dep array lean.
  const activeChips = useMemo<FilterChipItem[]>(() => {
    const filterGroup = config.options?.groups?.find(g => g.id === 'filter');
    const labelByKey = new Map(
      (filterGroup?.options ?? []).map(o => [o.key, o.label]),
    );
    const filterChips = Object.values(state.filters)
      .flatMap(keys => keys)
      .map(key => ({key, label: labelByKey.get(key) ?? key}));
    const sortGroup = config.options?.groups?.find(g => g.id === 'sort');
    const sortChips =
      state.sort && sortGroup
        ? sortGroup.options
            .filter(o => o.key === state.sort)
            .map(o => ({key: `sort:${o.key}`, label: `Sort: ${o.label}`}))
        : [];    return [...sortChips, ...filterChips];
  }, [config.options, state.filters, state.sort]);

  const filterGroupId =
    config.options?.groups?.find(g => g.id === 'filter')?.id ?? 'filter';
  const handleChipSelect = useCallback(
    (key: string) => {
      if (key.startsWith('sort:')) {
        setOption('sort', '');
        return;
      }
      const current = state.filters[filterGroupId] ?? [];
      setOption('filter', current.filter(k => k !== key));
    },
    [state.filters, filterGroupId, setOption],
  );

  // The clear-once-on-search rule. The previous query is kept in a ref
  // so the effect fires on the TRANSITION (empty → a term) and not on
  // every change of the filter count.
  const previousQueryRef = useRef(search.debouncedQuery);
  const filterCount = state.filters[filterGroupId]?.length ?? 0;
  useEffect(() => {
    const hadQuery = previousQueryRef.current.trim().length > 0;
    const hasQuery = search.debouncedQuery.trim().length > 0;
    previousQueryRef.current = search.debouncedQuery;
    if (autoClearFilterOnSearch && !hadQuery && hasQuery && filterCount > 0) {
      setOption('filter', []);
    }
  }, [
    autoClearFilterOnSearch,
    search.debouncedQuery,
    filterCount,
    setOption,
  ]);

  // The symmetric rule — a filter picked while a term is on screen
  // clears the term (see the prop's doc). The previous filter count is
  // kept in a ref so the rule fires on the TRANSITION (no filter → a
  // filter), not on every render.
  const previousFilterCountRef = useRef(filterCount);
  useEffect(() => {
    const hadFilter = previousFilterCountRef.current > 0;
    previousFilterCountRef.current = filterCount;
    if (
      autoClearSearchOnFilter &&
      !hadFilter &&
      filterCount > 0 &&
      search.debouncedQuery.trim().length > 0
    ) {
      search.clear();
    }
  }, [
    autoClearSearchOnFilter,
    filterCount,
    search.debouncedQuery,
    search.clear,
  ]);

  const ctx = useMemo<SectionRenderContext>(
    () => ({
      query: search.debouncedQuery,
      options,
      offline: !isOnline,
      setAtListEnd: reportAtListEnd,
    }),
    [search.debouncedQuery, options, isOnline, reportAtListEnd],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title={config.title} />

      <View style={styles.searchSection}>
        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          onDebouncedChange={search.handleDebouncedChange}
          debounceMs={search.debounceMs}
          placeholder={config.search?.placeholder ?? 'Search…'}
          accessibilityLabel={`Search ${config.title}`}
          onClear={search.clear}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chipsSlot}>
        {activeChips.length > 0 ? (
          <FilterChips
            items={activeChips}
            selectedKeys={activeChips.map(c => c.key)}
            onSelect={handleChipSelect}
            singleSelect={false}
            // The row's own 12 dp of horizontal padding is dropped so the
            // strip's gutter is the shell's 16 dp and not 16 + 12.
            contentContainerStyle={styles.chipsRow}
          />
        ) : null}
      </View>

      <View style={styles.content}>{config.renderContent(ctx)}</View>

      <Fab
        icon="sliders"
        onPress={() => setSheetVisible(true)}
        accessibilityLabel={`Filter ${config.title} options`}
        // The button is there for the whole list, and gone once the list
        // is finished and the user is looking at its end — see
        // `atListEnd` above.
        visible={hasOptions && !atListEnd}
        badgeCount={activeFilterCount}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={`${config.title} filter`}
        groups={(config.options?.groups ?? []).map<FilterSheetGroup>(g => ({
          id: g.id,
          title: g.title,
          multiSelect: g.multiSelect ?? false,
          collapsedRowLimit: g.collapsedRowLimit,
          defaultKey: g.defaultKey,
          // `layout` and the row's `icon` / `image` are undefined for
          // every group that does not opt into the Cover Shelf, so the
          // chip groups (Movies, Search, Radio, Live TV) render exactly
          // as they always have.
          layout: g.layout,
          clearKey: g.clearKey,
          rows: g.options.map(o => ({
            key: o.key,
            label: o.label,
            icon: o.icon,
            image: o.image,
          })),
        }))}
        // Only the groups the config actually declares carry a value.
        // `state.view` is undefined unless the config has a `view` group
        // (see `useSectionOptions`), so the sheet's "RESET FILTERS"
        // footer — which appears when anything is active — is there only
        // when a filter or a sort really is active.
        value={{
          ...state.filters,
          ...(state.sort ? {sort: [state.sort]} : {}),
          ...(state.view ? {view: [state.view]} : {}),
        }}
        onChange={(groupId, keys) => {
          if (groupId === 'filter') {
            setOption('filter', keys);
          } else {
            setOption(groupId as 'sort' | 'view', keys[0] ?? '');
          }
        }}
        onReset={reset}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  chipsSlot: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  chipsRow: {
    paddingHorizontal: 0,
  },
  content: {flex: 1},
});
