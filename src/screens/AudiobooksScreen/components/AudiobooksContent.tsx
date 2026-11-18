// ─── Audiobooks — Browse Content ───────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 — rewritten from the screen's own hand-rolled shell.
//
// It used to draw its own `InternalHeader`, `SearchBar`, `FilterChips`
// row, `Placeholder` states and an `ActivityOrb` footer, and its
// `refreshControl` was a NO-OP `<View>` — pull-to-refresh was advertised
// and inert. It is now the same content component every other browse
// screen has:
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

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useAudiobooksData} from './AudiobooksDataProvider';
import {BookCard} from './BookCard';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {ListStates} from './ListStates';
import {createAudiobooksScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

export const AudiobooksContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createAudiobooksScreenStyles(), []);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    pageError,
    scopeLabel,
    setActiveGenre,
    setSearchTerm,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isSearchActive,
    handleBookPress,
  } = useAudiobooksData();
  const {offline} = ctx;

  // The shell owns the selected genre; the content hands it down.
  // The genre group is SINGLE-select (LibriVox takes one genre per
  // request), so the first key is the only key there can be.
  const rawFilter = ctx.options.filter;
  const genre = Array.isArray(rawFilter)
    ? rawFilter[0] ?? ''
    : rawFilter ?? '';

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the FAB filter → the hook's active scope.
  useEffect(() => {
    setActiveGenre(genre);
  }, [genre, setActiveGenre]);

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
          onRetry={() => {}}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-AudiobooksScreen-list"
        style={styles.list}
        numColumns={1}
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => <BookCard item={item} onPress={handleBookPress} />}
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
              genreLabel={scopeLabel}
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
