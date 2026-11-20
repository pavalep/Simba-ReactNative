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
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {IconName} from '../../components/utility/SvgIcon';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {FilterChips, type FilterChipItem} from '../../components/utility/FilterChips';
import {Fab} from '../../components/core/Fab/Fab';
import {FilterSheet, type FilterSheetGroup} from '../../components/sheets/FilterSheet/FilterSheet';
import {useSectionSearch} from '../../hooks/useSectionSearch';
import type {SectionOptionsApi} from '../../hooks/useSectionOptions';
import type {SectionBrowseConfig} from './sectionBrowseConfig';
import type {SectionRenderContext} from './sectionRenderContext';
import type {SectionRouteParams} from './sectionRoute';

/**
 * The handle a filter chip's key is written with.
 *
 * A chip's key must say which AXIS it belongs to: the Radio screen's
 * genre 'Rock' and a country called 'Rock' are the same string, and
 * removing one must not remove the other.
 */
const FILTER_CHIP_PREFIX = 'f:';

interface Props {
  config: SectionBrowseConfig;
  optionsApi: SectionOptionsApi;
  routeParams: SectionRouteParams;
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
  /**
   * An action in the header's TRAILING slot.
   *
   * `InternalHeader` has carried a right-action slot all along; the
   * shell simply did not pass one through, so the Radio screen — the
   * only catalogue with a second route (the saved stations) — had to
   * draw its own heart ON TOP of the header. The slot is the header's
   * own, so the action belongs inside it.
   */
  headerRightAction?: {
    /**
     * The action's glyph.
     *
     * A LABEL action carries no glyph — it is a named button (the
     * Bookmarks page's "Clear all"), and the header's slot grows to
     * fit the text.
     */
    icon?: IconName;
    /** The action's text. */
    label?: string;
    /**
     * `destructive` paints a LABEL action in the error colour.
     *
     * A control that wipes the page's content must not wear the same
     * gold as a neutral action.
     */
    tone?: 'accent' | 'destructive';
    onPress: () => void;
    /** A button that carries only an icon has no name. */
    accessibilityLabel: string;
  };
}

export const BrowseLayout: React.FC<Props> = ({
  config,
  optionsApi,
  routeParams,
  autoClearFilterOnSearch = false,
  autoClearSearchOnFilter = false,
  headerRightAction,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {isOnline} = useNetworkStatus();

  const search = useSectionSearch(config, routeParams);

  const hasOptions = !!config.options?.groups?.length;
  /**
   * Does this screen have a FILTER axis?
   *
   * `sort` and `view` are not filter axes — they are single-valued
   * options. The chip strip is the FILTER strip, so a screen with no
   * filter axis has no strip and reserves no gutter for one; its sort
   * and its view live in the option sheet, where the applied one is
   * drawn in the accent colour.
   *
   * Every one of the eight browse catalogues HAS a filter axis, so
   * this changes nothing for them. It is what lets a LIST page — no
   * filters, no paging, no footer — use the same shell.
   */
  const hasFilterGroups = (config.options?.groups ?? []).some(
    g => g.id !== 'sort' && g.id !== 'view',
  );
  /**
   * Does this screen have a search field?
   *
   * THE CONFIG DECLARES THE CHROME. A screen that declares no
   * `search` gets no search field, and one that declares no option
   * groups gets no filter button. The eight catalogues all declare a
   * search, so nothing changes for them.
   */
  const hasSearch = !!config.search;
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
  //
  // EVERY filter axis is represented. It used to read only the group
  // whose id was 'filter', so a screen with three axes (Radio: genre,
  // country, language) could hold three selections and the strip would
  // show one of them — or none, when none of them was called 'filter'.
  //
  // The chip's KEY carries its group, because a key alone cannot say
  // which axis it belongs to: the Radio screen's 'Rock' (genre) and a
  // country called 'Rock' would be the same string. The key is an
  // internal handle — it is read back by `handleChipSelect` and never
  // shown.
  const activeChips = useMemo<FilterChipItem[]>(() => {
    const groups = config.options?.groups ?? [];
    const filterGroups = groups.filter(g => g.id !== 'sort' && g.id !== 'view');
    const filterChips = filterGroups.flatMap(group => {
      const selected = state.filters[group.id] ?? [];
      return selected.map(key => {
        const option = group.options.find(o => o.key === key);
        return {
          key: `${FILTER_CHIP_PREFIX}${group.id}:${key}`,
          label: option?.label ?? key,
        };
      });
    });
    const sortGroup = groups.find(g => g.id === 'sort');
    const sortChips =
      state.sort && sortGroup
        ? sortGroup.options
            .filter(o => o.key === state.sort)
            .map(o => ({key: `sort:${o.key}`, label: `Sort: ${o.label}`}))
        : [];    return [...sortChips, ...filterChips];
  }, [config.options, state.filters, state.sort]);

  const handleChipSelect = useCallback(
    (key: string) => {
      if (key.startsWith('sort:')) {
        setOption('sort', '');
        return;
      }
      // The chip carries its group: `f:<groupId>:<optionKey>`.
      const rest = key.slice(FILTER_CHIP_PREFIX.length);
      const separator = rest.indexOf(':');
      if (separator < 0) return;
      const groupId = rest.slice(0, separator);
      const optionKey = rest.slice(separator + 1);
      const current = state.filters[groupId] ?? [];
      setOption(groupId, current.filter(k => k !== optionKey));
    },
    [state.filters, setOption],
  );

  // The clear-once-on-search rule. The previous query is kept in a ref
  // so the effect fires on the TRANSITION (empty → a term) and not on
  // every change of the filter count.
  const previousQueryRef = useRef(search.debouncedQuery);
  // EVERY filter group's id — the screen may have more than one axis,
  // and the rule below applies to the scope as a whole.
  const filterGroupIds = useMemo(
    () =>
      (config.options?.groups ?? [])
        .filter(g => g.id !== 'sort' && g.id !== 'view')
        .map(g => g.id),
    [config.options],
  );
  const filterCount = filterGroupIds.reduce(
    (sum, id) => sum + (state.filters[id]?.length ?? 0),
    0,
  );
  useEffect(() => {
    const hadQuery = previousQueryRef.current.trim().length > 0;
    const hasQuery = search.debouncedQuery.trim().length > 0;
    previousQueryRef.current = search.debouncedQuery;
    if (autoClearFilterOnSearch && !hadQuery && hasQuery && filterCount > 0) {
      filterGroupIds.forEach(id => setOption(id, []));
    }
  }, [
    autoClearFilterOnSearch,
    search.debouncedQuery,
    filterCount,
    filterGroupIds,
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
      {/*
        THE PAGE'S SURFACE.

        The shell owns the surface, and the config says which one it is
        (`background: 'flat'` | `'gradient'`). The gradient is drawn
        FIRST, so it sits under the status bar, the header, the search
        field and the content — and the root's own `backgroundColor`
        under it is the gradient's first stop, so the strip above the
        gradient reads the same either way.

        The list pages (All Audio, All Videos, Downloads, Genre) wore
        this gradient before they joined the shell. The browse
        catalogues do not, and they did not start wearing one when the
        shell arrived: the surface is the page's own choice, declared in
        the config.
      */}
      {config.background === 'gradient' ? (
        <LinearGradient
          colors={[colors.background.primary, colors.background.elevated]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <SimbaStatusBar variant="home" />
      <InternalHeader title={config.title} rightAction={headerRightAction} />

      {hasSearch ? (
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
      ) : null}

      {hasFilterGroups ? (
        <View style={styles.chipsSlot} testID="browse-active-filters">
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
      ) : null}

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
          // `sort` and `view` hold ONE value; every other group is a
          // filter axis and holds a list. The group id is the group's
          // own — 'filter' for the single-axis screens, 'genre' /
          // 'country' / 'language' for the Radio screen's three.
          if (groupId === 'sort' || groupId === 'view') {
            setOption(groupId, keys[0] ?? '');
          } else {
            setOption(groupId, keys);
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
