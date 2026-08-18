// ─── v10.1: Unified Section Browse — Shell (FAB-only) ───────────────────
// Wave 2 (Phase 2.1) → Wave 6 (v10.1 de-tab). ONE layout for all 8 section
// pages (spec §3):
//
//   SimbaStatusBar → InternalHeader (config.title) → shared SearchBar →
//   FilterChips slot (ACTIVE filter chip) → {config.renderContent(ctx)} →
//   SectionFab → SectionOptionsSheet
//
// The ONLY per-section part is `config.renderContent` ("cards may differ,
// shells may not"). Search, refresh/offline state live at the shell level
// so they persist across filter changes (the user's search-persistence
// standard). The OPTIONS state (filters/sort/view) is NOT owned here — it
// lives at the composition root (the host screen) and arrives via
// `optionsApi`, so data providers ABOVE the shell read the same state
// (e.g. Movies passes its sort key into the fetch). No tabs, no pager —
// v10.1 removed the TabView machinery (SectionTabBar / useSectionTabs /
// tabs[] deleted).

import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {FilterChips, type FilterChipItem} from '../../components/utility/FilterChips';
import {SectionFab} from './components/SectionFab';
import {FilterSheet, type FilterSheetGroup} from '../../components/sheets/FilterSheet/FilterSheet';
import {useSectionSearch} from './hooks/useSectionSearch';
import type {SectionOptionsApi} from './hooks/useSectionOptions';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
  SectionRouteKey,
  SectionRouteParams,
} from './sectionConfig';

interface SectionBrowseLayoutProps {
  config: SectionBrowseConfig;
  /** Options state (filters/sort/view) owned by the host screen — the
   *  composition root. Passed in so data providers ABOVE the shell can
   *  read the same selection (e.g. Movies feeds `optionsApi.options.sort`
   *  into its fetch hook). */
  optionsApi: SectionOptionsApi;
  /** Route params from the host screen (Home deep-link presets). */
  routeParams: SectionRouteParams<SectionRouteKey>;
}

export const SectionBrowseLayout: React.FC<SectionBrowseLayoutProps> = ({
  config,
  optionsApi,
  routeParams,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {isOnline} = useNetworkStatus();

  // ── Search (shared, persists across filter changes) ────────────────────
  // The hook owns raw + debounced state; SearchBar owns the debounce timer
  // (no double-debounce). `handleDebouncedChange` drops stale echoes so an
  // older keystroke can never resurrect over a newer one.
  const {query, setQuery, debouncedQuery, handleDebouncedChange, clear, debounceMs} =
    useSectionSearch(config, routeParams);

  const onDebouncedChange = useCallback(
    (text: string) => {
      handleDebouncedChange(text);
    },
    [handleDebouncedChange],
  );

  // ── FAB → options sheet (config-driven) ────────────────────────────────
  // The host screen owns ALL option state (filters/sort/view) via
  // `optionsApi`; the shell just reads it. The sheet reads/writes the
  // SAME record threaded into `ctx.options` (one source of truth), the
  // FAB shows `activeFilterCount` as a badge, and `reset` backs the
  // sheet's one-tap "Reset" row.
  const hasOptions = !!config.options?.groups?.length;
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const {state, setOption, reset, activeFilterCount, options} = optionsApi;

  // ── Active filter chip(s) (v10.1 FilterChips slot) ─────────────────────
  // Derived from `options.filters` (the FILTER group selection). Multi-
  // select: ONE chip per selected KEY (e.g. "Classic Films" + "Westerns"
  // → two chips). Labels come from the config's filter options so the chip
  // reads like the sheet ("Rock", "Classic Films"), not the raw key. The
  // active SORT selection surfaces as one more chip (single-select
  // feedback) so the user sees the applied ordering under search too.
  // This is FEEDBACK, not navigation — tapping a chip clears just that
  // selection.
  const activeChips = useMemo<FilterChipItem[]>(() => {
    const filterGroup = config.options?.groups?.find(g => g.id === 'filter');
    const labelByKey = new Map(
      (filterGroup?.options ?? []).map(o => [o.key, o.label]),
    );
    const filterChips = Object.values(state.filters)
      .flatMap(keys => keys)
      .map(key => ({key, label: labelByKey.get(key) ?? key}));
    // Sort chip: `sort:`-prefixed key so `handleChipSelect` can tell it
    // apart from a FILTER chip on tap.
    const sortGroup = config.options?.groups?.find(g => g.id === 'sort');
    const sortChips =
      state.sort && sortGroup
        ? sortGroup.options
            .filter(o => o.key === state.sort)
            .map(o => ({key: `sort:${o.key}`, label: o.label}))
        : [];
    return [...filterChips, ...sortChips];
  }, [config.options, state.filters, state.sort]);

  // Chip tap → remove exactly that selection. FILTER chips drop one key
  // from the multi-select group (the sheet is where you ADD more);
  // the SORT chip is single-select — tapping clears it back to the
  // default order. Removing the last filter key clears the group to the
  // default "All" stream.
  const handleChipSelect = useCallback(
    (key: string) => {
      if (key.startsWith('sort:')) {
        setOption('sort', '');
        return;
      }
      const filterGroupId =
        config.options?.groups?.find(g => g.id === 'filter')?.id ?? 'filter';
      const current = state.filters[filterGroupId] ?? [];
      setOption('filter', current.filter(k => k !== key));
    },
    [config.options, state.filters, setOption],
  );

  // ── Render context (shell-level, shared by the ONE content stream) ─────
  // `offline` is REAL (useNetworkStatus) so content renderers can keep
  // showing cached data while offline; `onRetry` is the shared ErrorState
  // handler. `query` persists across filter changes because it lives HERE,
  // not inside a scene — the user's search-persistence standard (spec §3).
  const ctx = useMemo<SectionRenderContext>(
    () => ({
      query: debouncedQuery,
      activeChips,
      options,
      refreshing: false,
      offline: !isOnline,
      // Shell fallback so the shared ErrorState always has a live button.
      // Migrated sections rebind this to the active scope's refetch.
      onRetry: () => {},
      routeParams: routeParams as SectionRouteParams<SectionRouteKey>,
    }),
    [debouncedQuery, activeChips, options, isOnline, routeParams],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title={config.title} />

      {/* ── Shared search (stays put while the filter changes) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onDebouncedChange={onDebouncedChange}
          debounceMs={debounceMs}
          placeholder={config.search.placeholder}
          accessibilityLabel={`Search ${config.title}`}
          onClear={clear}
          returnKeyType="search"
        />
      </View>

      {/* ── FilterChips slot — ACTIVE filter chips (gold, tap = remove) ── */}
      {activeChips.length > 0 ? (
        <View style={styles.chipsSlot}>
          <FilterChips
            items={activeChips}
            selectedKeys={activeChips.map(c => c.key)}
            onSelect={handleChipSelect}
            singleSelect={false}
          />
        </View>
      ) : null}

      {/* ── ONE content stream — the only per-section part ── */}
      <View style={styles.content}>{config.renderContent(ctx)}</View>

      {/* ── SectionFab — bottom-right "more this section can do" ── */}
      <SectionFab
        onPress={() => {
          console.log('[SectionBrowseLayout] FAB tapped — opening sheet', config.route);
          setOptionsSheetVisible(true);
        }}
        accessibilityLabel={`Filter ${config.title} options`}
        visible={hasOptions}
        badgeCount={activeFilterCount}
      />

      {/* ── FilterSheet — the FAB's payload (v10.2 multi-select) ── */}
      {/* Translate the section config's groups → FilterSheet's data-driven
          shape. The FILTER group is marked multiSelect: true so users can
          pick several categories at once (Movies: "Classic Films +
          Documentaries"). `value` is a per-group keys array — `filters`
          already is; sort/view scalars are wrapped into one-element
          arrays so the "Sort by" row lights up when picked. */}
      <FilterSheet
        visible={optionsSheetVisible}
        onClose={() => {
          console.log('[SectionBrowseLayout] FilterSheet onClose', config.route);
          setOptionsSheetVisible(false);
        }}
        title={`${config.title} filter`}
        groups={(config.options?.groups ?? []).map<FilterSheetGroup>(g => ({
          id: g.id,
          title: g.title,
          multiSelect: g.multiSelect ?? false,
          collapsedRowLimit: g.collapsedRowLimit,
          rows: g.options.map(o => ({key: o.key, label: o.label})),
        }))}
        value={{
          ...state.filters,
          ...(state.sort ? {sort: [state.sort]} : {}),
          ...(state.view ? {view: [state.view]} : {}),
        }}
        onChange={(groupId, keys) => {
          // FILTER group is multi-select — forward the whole array.
          // SORT / VIEW are single-select — wrap the lone key into an
          // array (the hook reads `[0]` for those).
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

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    // Matches the legacy Movies search geometry px-for-px (spec §2).
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipsSlot: {
    paddingBottom: spacing.xs,
  },
  content: {
    flex: 1,
  },
});
