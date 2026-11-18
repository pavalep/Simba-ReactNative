// ─── Shows — Browse Content ─────────────────────────────────────────────
// The list the browse shell hosts.
//
// It used to draw its own `InternalHeader`, its own `SearchBar`, its own
// `FilterChips` row of "Search / Browse" sources, its own `Placeholder`
// states and a second, hand-rolled list for "Airing Today". It is now
// the same content component every other browse screen has:
//
//   • the shell owns the header, the search field, the chip strip, the
//     filter FAB and the filter sheet;
//   • `ListStates` owns loading / error / empty;
//   • `BrowseFooter` owns the four footer branches;
//   • `useListEnd` tells the shell when the list is finished AND the user
//     is at its end, so the filter button can step aside;
//   • the drag guard stops a list that fits on one screen from fetching a
//     page nobody asked for;
//   • `usePullToRefresh` owns the refresh spinner, so it tracks the
//     GESTURE and not the query.
//
// THE "AIRING TODAY" RAIL
// ----------------------
// The rail is the LIST's `ListHeaderComponent` — the one slot the shell
// does not own. It scrolls with the catalogue, and the shell still hosts
// ONE list. See `components/AiringTodayRail.tsx` for why it is a
// separate list and not a scope of the catalogue.
//
// THE SCOPE
// ---------
// The scope group and the search field are the shell's, so the content
// reads them and hands them down. A term beats the scope group: TVMaze
// cannot answer a term and a scope in one request (measured), and the
// shell clears one when the other arrives.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useShowsData} from './ShowsDataProvider';
import {ShowRow} from './ShowRow';
import {AiringTodayRail} from './AiringTodayRail';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {ListStates} from './ListStates';
import {createShowsScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

export const ShowsContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createShowsScreenStyles(colors), [colors]);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    items,
    todayItems,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    pageError,
    scopeKind,
    setActiveScope,
    setSearchTerm,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isSearchActive,
    handleShowPress,
  } = useShowsData();
  const {offline} = ctx;

  // The shell owns the scope group and the search field. The group's
  // selection is a LIST (the shell's model) and the group is
  // single-select, so the FIRST key is the only key there can be.
  const scope = ctx.options.filters?.scope?.[0] ?? '';

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the FAB filter → the hook's active scope. The queryKey
  // includes the scope, so changing it re-points the query (or returns
  // the cached result if the user has visited this scope).
  useEffect(() => {
    setActiveScope(scope);
  }, [scope, setActiveScope]);

  const userDraggedRef = useRef(false);
  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && items.length === 0
      ? 'error'
      : !error && items.length === 0
      ? 'empty'
      : undefined;

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const showLoadingEarly = !hasMounted || (!hasLoaded && isLoading);

  // The source has nothing further to give.
  const reachedEnd = hasLoaded && !error && !hasNextPage;

  // The list tells the shell when it is finished AND the user is at its
  // end, so the shell can get the floating filter button out of the way
  // (see `_shared/useListEnd.ts`).
  const {onScroll, onContentSizeChange} = useListEnd(
    ctx.setAtListEnd,
    reachedEnd,
  );

  if (showLoadingEarly) {
    return (
      <View style={styles.sectionRoot}>
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          isTodayScope={scopeKind === 'today'}
          onRetry={() => {}}
        />
      </View>
    );
  }

  // The rail belongs to the CATALOGUE scope: the term scope answers a
  // different question, and the today scope's list IS the schedule, so a
  // rail of it would be the same shows twice.
  const railHeader =
    scopeKind === 'catalogue' && todayItems.length > 0 ? (
      <AiringTodayRail items={todayItems} onPress={handleShowPress} />
    ) : null;

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-ShowsScreen-list"
        style={styles.list}
        numColumns={1}
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <ShowRow item={item} onPress={handleShowPress} />
        )}
        ListHeaderComponent={railHeader}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          listState ? styles.listSlotGrow : null,
        ]}
        ListEmptyComponent={
          listState ? (
            <ListStates
              state={listState}
              offline={offline}
              isSearchActive={isSearchActive}
              isTodayScope={scopeKind === 'today'}
              error={error}
              onRetry={refetch}
            />
          ) : null
        }
        ListFooterComponent={
          <BrowseFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            // The LOAD-MORE error, not the list's error: a first-load
            // failure is the error card's business, and the footer saying
            // it too announced the same failure twice — and wrongly.
            error={pageError}
            reachedEnd={reachedEnd}
            shown={items.length}
            onLoadMore={fetchNextPage}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          if (!userDraggedRef.current) return;
          if (hasNextPage && !isLoadingMore) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            // The GESTURE owns the spinner, not the query. See
            // `_shared/pullToRefresh.ts`.
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};
