// ─── v10: Unified Section Browse — Shell ─────────────────────────────────
// Wave 2 (Phase 2.1). ONE layout for all 8 section pages (spec §3.2):
//
//   SimbaStatusBar → InternalHeader (config.title) → shared SearchBar →
//   [FilterChips slot — Wave 4] → SectionTabBar → content area →
//   [SectionFab slot — Wave 3]
//
// The ONLY per-section part is `config.renderTab` ("cards may differ,
// shells may not"). Search, chips, options and refresh/offline state live
// at the shell level so they persist across tab switches (the user's
// search-persistence standard).
//
// Phase 2.1 ships the shell in PREVIEW mode: Movies renders through it via
// a temp config override while its old body stays intact for A/B (removed
// in Wave 5, the pilot migration).

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {
  TabView,
  type NavigationState,
  type Route,
  type SceneRendererProps,
} from 'react-native-tab-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SectionTabBar} from './components/SectionTabBar';
import {SectionFab} from './components/SectionFab';
import {SectionOptionsSheet} from './components/SectionOptionsSheet';
import {useSectionTabs} from './hooks/useSectionTabs';
import {useSectionSearch, logSearchComparison} from './hooks/useSectionSearch';
import type {
  SectionBrowseConfig,
  SectionOptionGroupId,
  SectionRenderContext,
  SectionRouteKey,
  SectionRouteParams,
} from './sectionConfig';

// TEMP (Phase 2.3 validation): flip to preview the offline state without
// disabling the network (tracker Phase 2.3 step 9). Removed with the
// Wave 5 migration. Note: the GLOBAL OfflineBanner (app root) already
// covers the offline notification, so the shell does NOT duplicate a
// banner — it threads `offline` into ctx for content renderers instead.
const SECTION_PREVIEW_FORCE_OFFLINE = false;

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

  // ── Mount-time preselect ───────────────────────────────────────────────
  // Sections use different route-param names for the same intent
  // (Movies/LiveTV/Podcasts: categoryId; Music/Radio/Audiobooks/Archive/
  // Shows: initialTab; Audiobooks/Shows also accept initialGenre). Resolve
  // whichever this section actually set — the others are undefined, so the
  // first present one wins.
  const preselectKey = useMemo(() => {
    const p = (routeParams ?? {}) as {
      initialTab?: string;
      categoryId?: string | number;
      initialGenre?: string;
    };
    return (
      p.initialTab ??
      (p.categoryId != null ? String(p.categoryId) : undefined) ??
      p.initialGenre
    );
  }, [routeParams]);

  const {tabs, index, setIndex, initialTabIndex} = useSectionTabs(
    config,
    preselectKey,
  );

  // Jump to the route-preselect tab on mount (and if params change later).
  useEffect(() => {
    setIndex(initialTabIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTabIndex]);

  // ── Search (shared, persists across tab switches) ──────────────────────
  // Phase 2.2: the hook owns raw + debounced state; SearchBar owns the
  // debounce timer (no double-debounce). `handleDebouncedChange` drops stale
  // echoes so an older keystroke can never resurrect over a newer one.
  const {query, setQuery, debouncedQuery, handleDebouncedChange, clear, debounceMs} =
    useSectionSearch(config, routeParams);

  const onDebouncedChange = useCallback(
    (text: string) => {
      handleDebouncedChange(text);
      // TEMP dev harness (Phase 2.2 step 7) — removed with the migrations.
      logSearchComparison(config.route, query, text);
    },
    [handleDebouncedChange, config.route, query],
  );

  // ── Render context (shell-level, shared by every tab) ──────────────────
  // Phase 2.3: `offline` is REAL (useNetworkStatus) so content renderers can
  // keep showing cached data while offline; `onRetry` is the shared
  // ErrorState handler. Chips/options stay inert until Waves 3–4.
  // `query` persists across tab switches because it lives HERE, not inside
  // a scene — the user's search-persistence standard (v10 spec §3.3).
  const ctx = useMemo<SectionRenderContext>(
    () => ({
      query: debouncedQuery,
      activeChips: [],
      options: {},
      refreshing: false,
      offline: SECTION_PREVIEW_FORCE_OFFLINE || !isOnline,
      // Shell fallback so the shared ErrorState always has a live button.
      // Wave 5+ sections rebind this to the active tab's refetch.
      onRetry: () => {},
      routeParams: routeParams as SectionRouteParams<SectionRouteKey>,
    }),
    [debouncedQuery, routeParams, isOnline],
  );

  // ── FAB → options sheet (config-driven) ────────────────────────────────
  // Phase 3.2: the SHELL owns sheet visibility — the FAB only reports the
  // press. `previewOptions` is a TEMP in-shell harness so the sheet is
  // live on the Movies preview (Phase 3.2 step 9 validation); Phase 3.3
  // replaces it with the shared `useSectionOptions` hook. The record SHAPE
  // (Partial<Record<SectionOptionGroupId, string>>) is the contract the
  // hook + FilterChips reuse — one source of truth for selections.
  const hasOptions = !!config.options?.groups?.length;
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const [previewOptions, setPreviewOptions] = useState<
    Partial<Record<SectionOptionGroupId, string>>
  >({});

  // ── TabView wiring ─────────────────────────────────────────────────────
  const routes = useMemo(
    () => tabs.map(t => ({key: t.key, title: t.title})),
    [tabs],
  );

  const renderTabBar = useCallback(
    (props: SceneRendererProps & {navigationState: NavigationState<Route>}) => (
      <SectionTabBar {...props} />
    ),
    [],
  );

  // Each scene is keyed by its tab key so state never leaks between tabs
  // (parity with the legacy lazy TabView behavior).
  const renderScene = useCallback(
    ({route: tabRoute}: {route: Route}) => {
      const tab = tabs.find(t => t.key === tabRoute.key);
      if (!tab) return null;
      return (
        <View key={tab.key} style={styles.scene}>
          {config.renderTab(tab, ctx)}
        </View>
      );
    },
    [tabs, config, ctx],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <View key={`lazy-${tabRoute.key}`} style={styles.scene} />
    ),
    [],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title={config.title} />

      {/* ── Shared search (stays put while tabs change) ── */}
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

      {/* [FilterChips slot — Wave 4] */}

      {/* ── SectionTabBar (edge-to-edge, unified contract) ── */}
      <TabView
        navigationState={{index, routes}}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        style={styles.sceneContainer}
      />

      {/* ── SectionFab — bottom-right "more this section can do" ── */}
      <SectionFab
        onPress={() => setOptionsSheetVisible(true)}
        accessibilityLabel={`Filter ${config.title} options`}
        visible={hasOptions}
      />

      {/* ── SectionOptionsSheet — the FAB's payload (Phase 3.2) ── */}
      <SectionOptionsSheet
        visible={optionsSheetVisible}
        onClose={() => setOptionsSheetVisible(false)}
        title={config.title}
        groups={config.options?.groups ?? []}
        value={previewOptions}
        onOptionChange={(groupId, key) =>
          setPreviewOptions(prev => ({...prev, [groupId]: key}))
        }
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
  scene: {
    flex: 1,
  },
  sceneContainer: {
    flex: 1,
  },
});
