import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MovieCard} from './MovieCard';
import {MoviesDataProvider, useMoviesData} from './MoviesDataProvider';
import {MoviesFooter} from './MoviesFooter';
import {ListStates} from './ListStates';
import {createMoviesScreenStyles} from '../styles';
import type {SectionBrowseConfig, SectionRenderContext} from '../types';

export const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
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

  const categoryIds = useMemo<readonly string[]>(() => {
    const selected = ctx.options.filter;
    return selected && selected.length > 0 ? selected : ['all'];
  }, [ctx.options.filter]);
  const sortKey = ctx.options.sort;

  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(categoryIds);
  }, [categoryIds, searchTerm, sortKey]);

  const scope = getScope(categoryIds);
  const {items, numFound, hasLoaded, isLoading, isLoadingMore, error} = scope;
  const reachedEnd =
    hasLoaded && !error && numFound > 0 && items.length >= numFound;

  const userDraggedRef = useRef(false);
  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && items.length === 0
      ? 'error'
      : !error && items.length === 0
      ? 'empty'
      : undefined;

  const category = MOVIE_CATEGORIES.find(c => c.id === categoryIds[0]);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || (!hasLoaded && isLoading)) {
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
        renderItem={({item, index}) => (
          <MovieCard
            item={item}
            placeholderImage={category?.image}
            onPress={handleMoviePress}
            isResolving={resolvingId === item.identifier}
            isLonelyItem={index === items.length - 1 && items.length % 2 !== 0}
          />
        )}
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
          if (userDraggedRef.current) loadMore(categoryIds);
        }}
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

export const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

export {MoviesDataProvider};
