// ─── Live TV — Browse Content ──────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE W22 — rewritten from the screen's own hand-rolled shell.
//
// It used to draw its own `SimbaStatusBar`, its own `InternalHeader`, its
// own `SearchBar`, its own gold-pill active-filter row, its own `Fab` and
// `FilterSheet`, and it opened the row menu with an `OptionSheetDialog`
// that offered "Add to Playlist" — an action the app's playlist rule
// refuses for live TV — and no queue action at all.
//
// It is now the same content component every other browse screen has:
//
//   • the shell owns the header, the search field, the chip strip, the
//     filter FAB and the filter sheet;
//   • `ListStates` owns loading / error / empty;
//   • `BrowseFooter` owns the four footer branches;
//   • `useListEnd` tells the shell when the list is finished AND the user
//     is at its end, so the filter button can step aside;
//   • the drag guard stops a list that fits on one screen from fetching a
//     slice nobody asked for;
//   • `usePullToRefresh` owns the refresh spinner, so it tracks the
//     GESTURE and not the query.
//
// THE LIST IS ALWAYS A LIST
// -------------------------
// The loading and error states render INSIDE the list, so the list — and
// with it the pull-to-refresh gesture — is there while the catalogue is
// downloading. The catalogue is 2.8 MB, so that first load is slow, and
// the gesture the user reaches for must not be missing while it happens.
//
// (The Music and Movies screens return the loading state INSTEAD of the
// list. Live TV keeps the list, and this is the screen's own rule — it is
// what the Live TV suite pins.)

import React, {useEffect, useMemo, useRef} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useLiveTVData} from './LiveTVDataProvider';
import {ChannelCard} from './ChannelCard';
import {ListStates} from './ListStates';
import {toRow} from '../related/channelRow';
import {createLiveTVScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

/** A MODULE-level separator — an inline arrow would be a new component
 *  type on every render, so the FlatList re-created every separator. */
const ItemSeparator: React.FC = () => {
  const {colors} = useTheme();
  const styles = useMemo(() => createLiveTVScreenStyles(), []);
  return (
    <View
      style={[styles.separator, {backgroundColor: colors.background.primary}]}
    />
  );
};

export const LiveTVContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createLiveTVScreenStyles(), []);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes on
  // top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    pageError,
    setActiveCategory,
    setSearchTerm,
    isSearchActive,
    scopeLabel,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isFavoriteId,
    handleChannelPress,
  } = useLiveTVData();
  const {offline} = ctx;

  // The rows, in the shape the card draws. ONE rule for the row
  // (`related/channelRow.ts`) — the browse list and the favourites list
  // draw the same card, so they cannot disagree about it.
  const rows = useMemo(() => items.map(toRow), [items]);

  // The shell owns the selected category; the content hands it down.
  // The category group is SINGLE-select (the catalogue's scope is ONE
  // category), so the first key is the only key there can be.
  const rawFilter = ctx.options.filter;
  const category = Array.isArray(rawFilter)
    ? rawFilter[0] ?? ''
    : rawFilter ?? '';

  // Keep the scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the shell's filter → the hook's active scope. The scope is
  // applied IN MEMORY over the one catalogue, so changing it costs
  // nothing.
  useEffect(() => {
    setActiveCategory(category);
  }, [category, setActiveCategory]);

  // Set by the first touch-scroll — see the `onEndReached` guard below.
  const userDraggedRef = useRef(false);

  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && items.length === 0
      ? 'error'
      : !error && items.length === 0
      ? 'empty'
      : undefined;

  // The source has nothing further to give. The paging is a client-side
  // slice of the catalogue, so "the end" is simply "everything in this
  // scope is on screen".
  const reachedEnd = hasLoaded && !error && !hasMore;

  // The list tells the shell when it is finished AND the user is at its
  // end, so the shell can get the floating filter button out of the way
  // (see `_shared/useListEnd.ts`).
  const {onScroll, onContentSizeChange} = useListEnd(
    ctx.setAtListEnd,
    reachedEnd,
  );

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-LiveTVScreen-list"
        style={styles.list}
        data={rows}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ChannelCard
            row={item}
            isFavorite={isFavoriteId(item.id)}
            onPress={handleChannelPress}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          // The state slot fills the viewport, so the error card and the
          // empty state have real height to anchor against.
          listState ? styles.listSlotGrow : null,
        ]}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={
          listState ? (
            <ListStates
              state={listState}
              offline={offline}
              isSearchActive={isSearchActive}
              categoryLabel={scopeLabel}
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
          // The drag guard: a scope whose whole result set fits on one
          // screen fires `onEndReached` the moment the list mounts, and
          // the slice nobody asked for is wasted work. Any touch-scroll
          // sets the flag first.
          if (!userDraggedRef.current) return;
          if (hasMore && !isLoadingMore) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            // The GESTURE owns the spinner, not the query. `isLoading`
            // is TanStack's `isFetching`, which is also true while a
            // BACKGROUND refetch runs — so the refresh spinner used to
            // appear for work the user never asked for. See
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
