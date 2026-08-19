// ─── Music Screen — Browse Layout Shell (per-screen copy) ────────────
// v10 unified section-browse layout: every section renders the SAME
// shell — header + search + chips + content + FAB + filter sheet. The
// ONLY per-screen part is `config.renderContent`. This is the per-screen
// copy for Music (identical in behaviour to the legacy shared
// SectionBrowseLayout; copied so each screen owns its own shell without
// a shared `sections/` folder).

import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {FilterChips, type FilterChipItem} from '../../../components/utility/FilterChips';
import {SectionFab} from './Fab';
import {FilterSheet, type FilterSheetGroup} from '../../../components/sheets/FilterSheet/FilterSheet';
import {useSectionSearch} from './hooks/useSearch';
import type {SectionOptionsApi} from './hooks/useOptions';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
  SectionRouteKey,
  SectionRouteParams,
} from './types';

interface Props {
  config: SectionBrowseConfig;
  optionsApi: SectionOptionsApi;
  routeParams: SectionRouteParams<SectionRouteKey>;
}

export const BrowseLayout: React.FC<Props> = ({
  config,
  optionsApi,
  routeParams,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {isOnline} = useNetworkStatus();

  const search = useSectionSearch(config, routeParams);

  const hasOptions = !!config.options?.groups?.length;
  const [sheetVisible, setSheetVisible] = useState(false);
  const {state, setOption, reset, activeFilterCount, options} = optionsApi;

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
        : [];
    return [...sortChips, ...filterChips];
  }, [config.options, state.filters, state.sort]);

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

  const ctx = useMemo<SectionRenderContext>(
    () => ({
      query: search.debouncedQuery,
      activeChips,
      options,
      refreshing: false,
      offline: !isOnline,
      onRetry: () => {},
      routeParams: routeParams as SectionRouteParams<SectionRouteKey>,
    }),
    [search.debouncedQuery, activeChips, options, isOnline, routeParams],
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
          />
        ) : null}
      </View>

      <View style={styles.content}>{config.renderContent(ctx)}</View>

      <SectionFab
        onPress={() => setSheetVisible(true)}
        accessibilityLabel={`Filter ${config.title} options`}
        visible={hasOptions}
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
          rows: g.options.map(o => ({key: o.key, label: o.label})),
        }))}
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
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    paddingBottom: 10,
  },
  chipsSlot: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
  },
  content: {flex: 1},
});