import React, {useEffect, useMemo, useRef} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {PodcastCategory} from '../../../constants/podcastCategories';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MAX_RESULTS_PER_QUERY} from '../related/constants';
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
  const insets = useSafeAreaInsets();
  const {
    items,
    maxRequested,
    isLoading,
    isLoadingMore,
    error,
    hasLoaded,
    isSearchActive,
    searchTerm,
    setSearchTerm,
    load,
    loadMore,
    retry,
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

  useEffect(() => {
    load(categoryId);
  }, [categoryId, searchTerm, load]);

  const state: 'loading' | 'error' | 'empty' | 'ready' =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';
  const reachedEnd =
    hasLoaded &&
    !error &&
    (items.length < maxRequested || maxRequested >= MAX_RESULTS_PER_QUERY);
  const userDraggedRef = useRef(false);
  const isEmptySlot = state === 'empty' || state === 'error';

  return (
    <View style={styles.sectionRoot}>
      {!hasLoaded && isLoading ? (
        <PodcastsOverlays
          isLoading={isLoading}
          hasLoaded={hasLoaded}
          isEmpty={items.length === 0}
        />
      ) : (
        <>
          <PodcastsOverlays
            isLoading={isLoading}
            hasLoaded={hasLoaded}
            isEmpty={items.length === 0}
          />
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
              {paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md},
              isEmptySlot ? styles.listSlotGrow : null,
            ]}
            ListEmptyComponent={
              <ListStates
                isLoading={isLoading}
                error={error}
                offline={offline}
                isSearchActive={isSearchActive}
                categoryLabel={categoryLabel}
                categoryId={categoryId}
                onRetry={() => retry(categoryId)}
              />
            }
            ListFooterComponent={
              <PodcastsFooter
                isLoadingMore={isLoadingMore}
                hasLoaded={hasLoaded}
                error={error}
                reachedEnd={reachedEnd}
                onLoadMore={() => loadMore(categoryId)}
              />
            }
            onScrollBeginDrag={() => {
              userDraggedRef.current = true;
            }}
            onEndReached={() => {
              if (userDraggedRef.current) loadMore(categoryId);
            }}
            onEndReachedThreshold={0.4}
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && hasLoaded}
                onRefresh={() => load(categoryId)}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
          />
        </>
      )}
    </View>
  );
};

export function createPodcastsContentRenderer(
  categories: PodcastCategory[],
): SectionBrowseConfig['renderContent'] {
  return ctx => <PodcastsContent ctx={ctx} categories={categories} />;
}

export {PodcastsDataProvider};
