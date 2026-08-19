// ─── Movie Browser Screen (v10.1 Wave 6) ────────────────────────────
// Composition root (spec §5): this screen OWNS the section options state
// (`useSectionOptions`) and hands it to BOTH neighbors —
//
//   • the data provider ABOVE the shell gets the active sort key, so
//     changing "sort by" in the FAB sheet re-fetches page 1 in the new
//     server-side order (IA owns ordering, pagination just appends);
//   • the shell (`BrowseLayout`) gets the full `optionsApi` and only
//     renders it (sheet / FAB badge / chips).
//
// One source of truth, unidirectional flow: screen owns → provider +
// shell read. This is the reference pattern other sections follow.
//
// The MoviesDataProvider sits ABOVE the shell so the single content
// stream shares ONE per-scope cache — the legacy "switching categories
// never refetches" behavior.
//
// `renderMoviesContent` is co-located below and wired into the section
// config via spread override — this breaks the circular import that the
// old `renderContent.tsx` bridge used to dodge.
//
// KISS FlatList (Podcasts parity, even simpler — no overlay / skeleton):
//   • one FlatList always renders,
//   • `ListEmptyComponent` handles loading / error / empty via ListStates,
//   • pull-to-refresh + footer spinner handle the visual feedback paths.

import React, {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './components/BrowseLayout';
import {useSectionOptions} from './hooks/useOptions';
import {MOVIES_SECTION_CONFIG} from './related/browseConfig';
import {
  MoviesDataProvider,
  useMoviesData,
} from './components/MoviesDataProvider';
import {MovieCard} from './components/MovieCard';
import {MoviesFooter} from './components/MoviesFooter';
import {ListStates} from './components/ListStates';
import {createMoviesScreenStyles} from './styles';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
} from './types';

// ─── Content (the config's renderContent) ─────────────────────────────

const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMoviesScreenStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
    isSearchActive,
    searchTerm,
    setSearchTerm,
    resolvingId,
    handleMoviePress,
  } = useMoviesData();
  const {offline} = ctx;

  // Active categories come from the shell's FILTER selection — a
  // string[] (multi-select). Empty array → the default "All" stream.
  const rawFilter = ctx.options.filter;
  const categoryIds: readonly string[] = useMemo(() => {
    if (rawFilter && rawFilter.length > 0) return rawFilter;
    return ['all'];
  }, [rawFilter]);

  // Active sort key comes straight from the shell's SORT selection —
  // same record the FAB sheet writes. It feeds `MoviesDataProvider`'s
  // `sortKey` prop (via the screen), which re-keys the scope cache; the
  // effect below re-fires page 1 in the new IA server-side order.
  const sortKey = ctx.options.sort;

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load page 1 for this combination on first mount / selection change.
  // The hook's hasLoaded/isLoading guard turns this into a no-op for
  // already-loaded scopes, so it's safe to fire on every change. Deps
  // cover ALL three components of the scope cache key
  // `<sorted ids>|<term>|<sortKey>` — a new sort or search term re-keys
  // the cache and must trigger the page-1 load. We use a ref-stash so
  // the effect doesn't re-fire when only ensureLoaded's identity changes.
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(categoryIds);
  }, [categoryIds, searchTerm, sortKey]);

  const scope = getScope(categoryIds);
  const {items, numFound, hasLoaded, isLoading, isLoadingMore, error} = scope;

  // Reached the end of the result set — every item IA reported (numFound)
  // is loaded, so nothing more can be fetched. Once here the footer flips
  // from "loading" to a terminal "caught up" state.
  const reachedEnd =
    hasLoaded && !error && numFound > 0 && items.length >= numFound;

  // Mount-time pagination guard: FlatList fires onEndReached once during
  // initial layout (distanceFromEnd reads 0 before content is measured).
  // Pagination is gated on a real user scroll — from the first drag
  // onward normal onEndReached behavior applies.
  const userDraggedRef = useRef(false);

  // ListEmptyComponent state: loading wins during initial resolve,
  // error wins when the fetch failed AND we have no items to show,
  // empty fires when the fetch succeeded but returned zero items.
  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && items.length === 0
      ? 'error'
      : !error && items.length === 0
      ? 'empty'
      : undefined;

  const category = MOVIE_CATEGORIES.find(c => c.id === categoryIds[0]);

  // First resolve of a scope (initial mount OR applying a filter that
  // hasn't been cached yet): show the centered loading pill INSTEAD of
  // the FlatList. Doing it here — outside the FlatList — guarantees the
  // pill is visible on the very first paint; FlatList's
  // ListEmptyComponent only fires after measurement, which can flash
  // past an instant API response and land on the empty state without
  // the user ever seeing the loading feedback.
  //
  // `hasMounted` starts false so the pill ALWAYS renders for the first
  // frame — even if the hook resolves instantly (cache hit). After the
  // first effect run we flip it to true; subsequent renders trust the
  // hook's `!hasLoaded && isLoading` instead.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const showLoading = !hasMounted || (!hasLoaded && isLoading);
  if (showLoading) {
    return (
      <View style={styles.sectionRoot}>
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          onRetry={() => {}}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-MoviesScreen-list"
        style={styles.list}
        data={items}
        numColumns={2}
        keyExtractor={item => item.identifier}
        renderItem={({item, index}) => {
          // Odd trailing card (sole item in its row) → render at explicit
          // 50% width instead of stretching to full screen via `flex: 1`.
          const isLonelyItem =
            index === items.length - 1 && items.length % 2 !== 0;
          return (
            <MovieCard
              item={item}
              placeholderImage={category?.image}
              onPress={handleMoviePress}
              isResolving={resolvingId === item.identifier}
              isLonelyItem={isLonelyItem}
            />
          );
        }}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: insets.bottom + spacing.md},
          listState ? styles.listSlotGrow : null,
        ]}
        ListEmptyComponent={
          listState ? (
            <ListStates
              state={listState}
              offline={offline}
              isSearchActive={isSearchActive}
              onRetry={() => retry(categoryIds)}
            />
          ) : null
        }
        ListFooterComponent={
          <MoviesFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            error={error}
            reachedEnd={reachedEnd}
            onLoadMore={() => loadMore(categoryIds)}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          if (!userDraggedRef.current) return;
          loadMore(categoryIds);
        }}
        // Lower threshold (0.35) so pagination kicks in BEFORE the user
        // reaches the visual bottom of the list — at 0.6 the trigger waited
        // until the user was almost off-screen, then jumped to a new page,
        // which read as a sudden append with no spinner. Triggering earlier
        // means the "Loading more…" footer is visible the moment the user
        // scrolls near the end and the next page fills in gracefully.
        onEndReachedThreshold={0.35}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasLoaded}
            onRefresh={() => refresh(categoryIds)}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};

/** The Movies `renderContent` — wired into SECTION_CONFIGS.MoviesScreen
 *  via spread override in the screen below. */
const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

// ─── Screen (composition root) ───────────────────────────────────────

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(MOVIES_SECTION_CONFIG, params);
  // Spread-override wires the real renderContent here — breaks the
  // config → content → screen → config circular import without the
  // old `renderContent.tsx` bridge file.
  const config: SectionBrowseConfig = {
    ...MOVIES_SECTION_CONFIG,
    renderContent: renderMoviesContent as (
      ctx: SectionRenderContext,
    ) => ReactNode,
  };
  return (
    <MoviesDataProvider sortKey={optionsApi.options.sort}>
      <BrowseLayout
        config={config}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MoviesDataProvider>
  );
};
