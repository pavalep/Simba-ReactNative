// ─── Podcasts Browser Screen (V2, KISS) ───────────────────────────────
// One screen file, one FlatList — the PodcastDetailScreen blueprint with
// the local `<BrowseLayout>` shell. Shell pieces (BrowseLayout,
// BrowseFab, BrowseContent, useOptions, useSearch, types, config) sit
// alongside the screen's other components/hooks/related/styles —
// integrated, not separated into a `browse/` subfolder.
//
// No post-sort: Podcast Index exposes no sort parameter and we don't
// client-side sort either — items render in API-returned order, and
// loadMore appends in order.
//
// No per-scope cache: every categoryId change / searchTerm change (and
// pull-to-refresh) wipes the current list and fetches fresh from the
// API. The hook keeps only ONE current-list state.
//
// States (loading / error / empty) render through ListEmptyComponent via
// `ListStates` (Placeholder-based, PodcastDetailScreen parity); the
// floating status pills (`PodcastsOverlays`) and the in-flow pagination
// footer (`PodcastsFooter`) are extracted components.
//
// Mount-time pagination guard: FlatList fires `onEndReached` once during
// initial layout (distanceFromEnd reads 0 before content is measured).
// Pagination is gated on a real user scroll — from the first drag onward
// normal onEndReached behavior applies.

import React, {useEffect, useMemo} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './components/BrowseLayout';
import {useSectionOptions} from './hooks/useOptions';
import type {SectionBrowseConfig, SectionRenderContext} from './types';
import {PODCASTS_SECTION_CONFIG} from './related/browseConfig';
import {PODCAST_CATEGORIES} from '../../constants/podcastCategories';
import {MAX_RESULTS_PER_QUERY} from './related/constants';
import {usePodcastsData} from './components/PodcastsDataProvider';
import {PodcastsDataProvider} from './components/PodcastsDataProvider';
import {PodcastRow} from './components/PodcastRow';
import {PodcastsFooter} from './components/PodcastsFooter';
import {PodcastsOverlays} from './components/PodcastsOverlays';
import {ListStates} from './components/ListStates';
import {createPodcastsScreenStyles} from './styles';

// ─── Content — the section's `renderContent` body ─────────────────────
export const PodcastsContent: React.FC<{ctx: SectionRenderContext}> = ({
  ctx,
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

  // Active category from the shell's FILTER group (single-select).
  const rawFilter = ctx.options.filter;
  const categoryId = (() => {
    const first = Array.isArray(rawFilter) ? (rawFilter[0] ?? '') : (rawFilter ?? '');
    return first || 'all';
  })();
  const categoryLabel =
    PODCAST_CATEGORIES.find(c => String(c.id) === categoryId)?.name ?? '';

  // Bridge: shell's debounced search term → provider.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Fresh fetch on every category / search change — no cache.
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

  const refreshControl = (
    <RefreshControl
      refreshing={isLoading}
      onRefresh={() => load(categoryId)}
      tintColor={colors.accent.gold}
      colors={[colors.accent.gold]}
    />
  );

  const userDraggedRef = React.useRef(false);

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
              if (!userDraggedRef.current) return;
              loadMore(categoryId);
            }}
            onEndReachedThreshold={0.4}
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          />
        </>
      )}
    </View>
  );
};

// ─── renderContent closure ────────────────────────────────────────────
// Lives here (the host screen) — `browseConfig.ts` ships a no-op stub
// that we override at mount time. This breaks the otherwise-circular
// `browseConfig ↔ index.tsx` import (browseConfig needs the closure;
// the closure needs `<PodcastsContent>` from here; and we need
// `PODCASTS_SECTION_CONFIG` from browseConfig). Co-locating the closure
// at the only consumer eliminates the bridge file.
const renderPodcastsContent: SectionBrowseConfig['renderContent'] =
  ctx => <PodcastsContent ctx={ctx} />;

// ─── Screen — the navigator component ─────────────────────────────────
// Spread the static entry to attach the real `renderContent` (the stub
// in `browseConfig.ts` is never invoked). Keeps the screen root as the
// single owner of `<PodcastsContent>` + its bridge.
export const PodcastsScreen: React.FC<RootStackScreenProps<'PodcastsScreen'>> =
  ({route}) => {
    const params = route.params ?? {};
    const config: SectionBrowseConfig = {
      ...PODCASTS_SECTION_CONFIG,
      renderContent: renderPodcastsContent,
    };
    const optionsApi = useSectionOptions(config, params);
    return (
      <PodcastsDataProvider>
        <BrowseLayout
          config={config}
          optionsApi={optionsApi}
          routeParams={params}
        />
      </PodcastsDataProvider>
    );
  };

// Re-exported for backwards compatibility — was the entry point in the
// legacy sectionConfig registry. New callers should import
// PODCASTS_SECTION_CONFIG directly from `./related/browseConfig`.
export type {SectionBrowseConfig};