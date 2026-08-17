// ─── v10.1: Unified Section Browse — Shell (FAB-only) ───────────────────
// Wave 2 (Phase 2.1) → Wave 6 (v10.1 de-tab). ONE layout for all 8 section
// pages (spec §3):
//
//   SimbaStatusBar → InternalHeader (config.title) → shared SearchBar →
//   FilterChips slot (ACTIVE filter chip) → {config.renderContent(ctx)} →
//   SectionFab → SectionOptionsSheet
//
// The ONLY per-section part is `config.renderContent` ("cards may differ,
// shells may not"). Search, filter state, refresh/offline state live at
// the shell level so they persist across filter changes (the user's
// search-persistence standard). No tabs, no pager — v10.1 removed the
// TabView machinery (SectionTabBar / useSectionTabs / tabs[] deleted).

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
import {SectionOptionsSheet} from './components/SectionOptionsSheet';
import {useSectionSearch} from './hooks/useSectionSearch';
import {useSectionOptions} from './hooks/useSectionOptions';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
  SectionRouteKey,
  SectionRouteParams,
} from './sectionConfig';

interface SectionBrowseLayoutProps {
  config: SectionBrowseConfig;
  /** Route params from the host screen (Home deep-link presets). */
  routeParams: SectionRouteParams<SectionRouteKey>;
}

export const SectionBrowseLayout: React.FC<SectionBrowseLayoutProps> = ({
  config,
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
  // The hook owns ALL option state (filters/sort/view). The sheet reads/
  // writes the SAME record threaded into `ctx.options` (one source of
  // truth), the FAB shows `activeFilterCount` as a badge, and `reset`
  // backs the sheet's one-tap "Reset" row. The FILTER group is seeded
  // from routeParams (deep-links pre-select a genre/category).
  const hasOptions = !!config.options?.groups?.length;
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const {state, setOption, reset, activeFilterCount, options} = useSectionOptions(
    config,
    routeParams,
  );

  // ── Active filter chip(s) (v10.1 FilterChips slot) ─────────────────────
  // Derived from `options.filters` (the FILTER group selection). Labels
  // come from the config's filter options so the chip reads like the
  // sheet ("Rock", "Classic Films"), not the raw key. This is FEEDBACK,
  // not navigation — tapping the chip clears back to the "All" default.
  const activeChips = useMemo<FilterChipItem[]>(() => {
    const filterGroup = config.options?.groups?.find(g => g.id === 'filter');
    const labelByKey = new Map((filterGroup?.options ?? []).map(o => [o.key, o.label]));
    return Object.keys(state.filters)
      .filter(k => state.filters[k] !== undefined)
      .map(k => ({key: k, label: labelByKey.get(k) ?? k}));
  }, [config.options, state.filters]);

  // Chip tap → setOption('filter', key); tapping the ACTIVE chip fires
  // onSelect('') (FilterChips singleSelect) → the hook clears to "All".
  const handleChipSelect = useCallback(
    (key: string) => {
      setOption('filter', key);
    },
    [setOption],
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

      {/* ── FilterChips slot — the ACTIVE filter chip (gold, tap = clear) ── */}
      {activeChips.length > 0 ? (
        <View style={styles.chipsSlot}>
          <FilterChips
            items={activeChips}
            selectedKey={activeChips[0]?.key}
            onSelect={handleChipSelect}
            singleSelect
          />
        </View>
      ) : null}

      {/* ── ONE content stream — the only per-section part ── */}
      <View style={styles.content}>{config.renderContent(ctx)}</View>

      {/* ── SectionFab — bottom-right "more this section can do" ── */}
      <SectionFab
        onPress={() => setOptionsSheetVisible(true)}
        accessibilityLabel={`Filter ${config.title} options`}
        visible={hasOptions}
        badgeCount={activeFilterCount}
      />

      {/* ── SectionOptionsSheet — the FAB's payload (Phase 3.2) ── */}
      <SectionOptionsSheet
        visible={optionsSheetVisible}
        onClose={() => setOptionsSheetVisible(false)}
        title={config.title}
        groups={config.options?.groups ?? []}
        value={options}
        onOptionChange={setOption}
        onReset={reset}
        showReset={activeFilterCount > 0}
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
