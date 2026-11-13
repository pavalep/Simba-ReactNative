import React, {useEffect, useMemo, useRef} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import type {PodcastCategory} from '../../../constants/podcastCategories';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {createPodcastsScreenStyles} from '../styles';
import type {SectionBrowseConfig, SectionRenderContext} from '../types';
import {ListStates} from './ListStates';
import {PodcastRow} from './PodcastRow';
import {PodcastsDataProvider, usePodcastsData} from './PodcastsDataProvider';
import {PodcastsFooter} from './PodcastsFooter';
import {PodcastsOverlays} from './PodcastsOverlays';

interface PodcastsContentProps {
  ctx: SectionRenderContext;
  categories: PodcastCategory[];
}

export const PodcastsContent: React.FC<PodcastsContentProps> = ({
  ctx,
  categories,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createPodcastsScreenStyles(colors), [colors]);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasLoaded,
    hasMore,
    isSearchActive,
    searchTerm,
    setSearchTerm,
    setActiveCategoryId,
    loadMore,
    retry,
    refreshing,
    refresh,
    handlePodcastPress,
  } = usePodcastsData();
  const {offline} = ctx;

  const rawFilter = ctx.options.filter;
  const categoryId = useMemo(() => {
    const first = Array.isArray(rawFilter)
      ? rawFilter[0] ?? ''
      : rawFilter ?? '';
    return first || 'all';
  }, [rawFilter]);
  const categoryLabel =
    categories.find(category => String(category.id) === categoryId)?.name ?? '';

  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // V20.2: TanStack owns the "wipe + refetch on scope change"
  // pattern. The active categoryId is part of the queryKey; the
  // setter triggers a fresh fetch automatically. No need to
  // also pass `searchTerm` in the deps array — `setSearchTerm`
  // (above) triggers the same refetch via the queryKey change.
  useEffect(() => {
    setActiveCategoryId(categoryId);
  }, [categoryId, setActiveCategoryId]);

  const state: 'loading' | 'error' | 'empty' | 'ready' =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';
  const reachedEnd = !hasMore;
  const userDraggedRef = useRef(false);
  const isEmptySlot = state === 'empty' || state === 'error';

  // The source has nothing further to give.
  const listComplete = hasLoaded && !error && !hasMore;

  // The list tells the shell when it is finished AND the user is at its
  // end, so the shell can get the floating filter button out of the way
  // (see `_shared/useListEnd.ts`).
  const {onScroll, onContentSizeChange} = useListEnd(
    ctx.setAtListEnd,
    listComplete,
  );

  return (
    <View style={styles.sectionRoot}>
      {/* The overlays float ABOVE the list in every state — a long press
          can only happen while the list is up, but a scope change must
          not unmount an open sheet mid-gesture. */}
      <PodcastsOverlays
        isLoading={isLoading}
        hasLoaded={hasLoaded}
        isEmpty={items.length === 0}
      />
      {/* The list is ALWAYS mounted. It used to be replaced by the
          overlays while the first page of a scope resolved, which
          unmounted the FlatList and threw away the scroll position on
          every category change; the loading pill is an overlay, so it
          does not need the list to be gone. */}
      <FlatList
        testID="section-PodcastsScreen-list"
        style={styles.list}
        data={state === 'ready' ? items : []}
        renderItem={({item}) => (
          <PodcastRow item={item} onPress={handlePodcastPress} />
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          isEmptySlot ? styles.listSlotGrow : null,
        ]}
        ListEmptyComponent={
          // Nothing at all until the first page has resolved — the
          // loading pill above is the whole state. After that the empty
          // and the error states share this one slot.
          !hasLoaded ? null : (
            <ListStates
              isLoading={isLoading}
              error={error}
              offline={offline}
              isSearchActive={isSearchActive}
              categoryLabel={categoryLabel}
              categoryId={categoryId}
              onRetry={() => retry()}
            />
          )
        }
        ListFooterComponent={
          <PodcastsFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            error={error}
            reachedEnd={reachedEnd}
            hasItems={items.length > 0}
            onLoadMore={() => loadMore()}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          // The drag guard: a list that is shorter than the viewport
          // fires `onEndReached` the moment it mounts, and a page that
          // nobody asked for is a wasted request. Any touch-scroll
          // sets the flag first.
          if (userDraggedRef.current) loadMore();
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
            // The refresh actually REFETCHES. It used to call
            // `setActiveCategoryId(categoryId)` with the value the
            // screen already had, so React saw no change and nothing
            // was refetched — the gesture spun and did nothing.
            onRefresh={refresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};

export function createPodcastsContentRenderer(
  categories: PodcastCategory[],
): SectionBrowseConfig['renderContent'] {
  return ctx => <PodcastsContent ctx={ctx} categories={categories} />;
}

export {PodcastsDataProvider};
