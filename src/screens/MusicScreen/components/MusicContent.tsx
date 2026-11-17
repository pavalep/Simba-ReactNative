import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {useMusicData} from './MusicDataProvider';
import {TrackCard} from './TrackCard';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {ListStates} from './ListStates';
import {createMusicScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

/**
 * Owns the Music data stream and its single virtualized list. The screen
 * entry point remains responsible only for route/config/provider composition.
 *
 * V18.3.3: this component used to call `getScope(genre)`, `ensureLoaded
 * (genre)`, `loadMore(genre)`, etc. on the per-scope cache. The V18 hook
 * returns a single active scope's data; switching scope = setActiveGenre,
 * the queryKey changes, TanStack re-fetches or returns cache.
 */
export const MusicContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMusicScreenStyles(), []);
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
    setActiveGenre,
    setSearchTerm,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isSearchActive,
    handleTrackPress,
  } = useMusicData();
  const {offline} = ctx;

  // The section shell owns the selected filter; Music is single-select.
  //
  // It is single-select because Jamendo's `/tracks/` takes ONE tag per
  // request: the sheet used to be multi-select and to claim it OR'd the
  // genres together, but the consumer read only `filter[0]`, so the user
  // could hold two genres in the strip while the list answered one.
  const rawFilter = ctx.options.filter;
  const genre = Array.isArray(rawFilter)
    ? (rawFilter[0] ?? '')
    : (rawFilter ?? '');

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the FAB filter → the hook's active scope. The queryKey
  // includes `activeGenre`, so changing it re-points the query (or
  // returns the cached result if the user has visited this scope).
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

  // The category's OWN name is the empty-state label — the app's genre
  // list is `MUSIC_CATEGORIES`, and the genre can only ever be one of
  // its ids (the sheet's row keys, or a route-param seed validated
  // against them).
  const activeCategory = MUSIC_CATEGORIES.find(c => String(c.id) === genre);
  const emptyGenreLabel = activeCategory?.name;

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-MusicScreen-list"
        style={styles.list}
        numColumns={1}
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <TrackCard item={item} onPress={handleTrackPress} />
        )}
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
              genreLabel={emptyGenreLabel}
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
            // it too announced the same failure twice — and wrongly
            // ("Couldn't load MORE" for a load-more that never started).
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
            // The GESTURE owns the spinner, not the query. `isLoading`
            // is TanStack's `isFetching`, which is also true while the
            // next PAGE loads — so the refresh spinner used to appear
            // at the top of the list the moment the user scrolled to
            // the end of it. See `_shared/pullToRefresh.ts`.
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
