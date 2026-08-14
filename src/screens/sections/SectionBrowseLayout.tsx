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
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SectionTabBar} from './components/SectionTabBar';
import {useSectionTabs} from './hooks/useSectionTabs';
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

  // ── Search ─────────────────────────────────────────────────────────────
  // Phase 2.1: temporary shell-local state so the shell is fully functional
  // in preview. Phase 2.2 replaces this with the shared `useSectionSearch`
  // hook. The debounce lives inside SearchBar (default 300ms) — do NOT
  // double-debounce here; `query` is the raw echo, `debouncedQuery` is what
  // content renderers read.
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleDebouncedChange = useCallback((text: string) => {
    setDebouncedQuery(text);
  }, []);

  // ── Render context (shell-level, shared by every tab) ──────────────────
  // Phase 2.1 stub: chips/options/refresh/offline are inert until Waves
  // 2.3–4 wire the real state machine. `query` persists across tab switches
  // because it lives HERE, not inside a scene — the user's search-persistence
  // standard (v10 spec §3.3).
  const ctx = useMemo<SectionRenderContext>(
    () => ({
      query: debouncedQuery,
      activeChips: [],
      options: {},
      refreshing: false,
      offline: false,
      routeParams: routeParams as SectionRouteParams<SectionRouteKey>,
    }),
    [debouncedQuery, routeParams],
  );

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
          onChangeText={handleChangeText}
          onDebouncedChange={handleDebouncedChange}
          debounceMs={config.search.debounceMs ?? 300}
          placeholder={config.search.placeholder}
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

      {/* [SectionFab slot — Wave 3] */}
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
