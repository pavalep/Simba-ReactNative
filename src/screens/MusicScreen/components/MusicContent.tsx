import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {JAMENDO_GENRES, type MusicScopeState} from '../hooks/useMusicScreen';
import {useMusicData} from './MusicDataProvider';
import {TrackCard} from './TrackCard';
import {MusicFooter} from './MusicFooter';
import {ListStates} from './ListStates';
import {createMusicScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

/** Capitalized genre label for copy (for example, "no Rock tracks found"). */
function genreLabel(genre: string): string {
  const match = JAMENDO_GENRES.find(g => g === genre);
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : genre;
}

/**
 * Owns the Music data stream and its single virtualized list. The screen
 * entry point remains responsible only for route/config/provider composition.
 */
export const MusicContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMusicScreenStyles(), []);
  const insets = useSafeAreaInsets();
  const {
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
    isSearchActive,
    setSearchTerm,
    handleTrackPress,
  } = useMusicData();
  const {offline} = ctx;

  // The section shell owns the selected filter; Music is single-select.
  const rawFilter = ctx.options.filter;
  const genre = Array.isArray(rawFilter)
    ? (rawFilter[0] ?? '')
    : (rawFilter ?? '');

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(genre);
  }, [genre]);

  const scope: MusicScopeState = getScope(genre);
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

  // Avoid an initial onEndReached call before the list has been measured.
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

  const activeCategory = MUSIC_CATEGORIES.find(c => String(c.id) === genre);
  const emptyGenreLabel =
    activeCategory?.name ?? (genre ? genreLabel(genre) : undefined);

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
          {paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md},
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
              onRetry={() => retry(genre)}
            />
          ) : null
        }
        ListFooterComponent={
          <MusicFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            error={error}
            onLoadMore={() => loadMore(genre)}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          if (!userDraggedRef.current) return;
          loadMore(genre);
        }}
        onEndReachedThreshold={0.4}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasLoaded}
            onRefresh={() => refresh(genre)}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};
