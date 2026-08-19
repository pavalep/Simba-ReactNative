// ─── Podcasts Browser Content (v10.2 — Movies replication) ─────────────
// The per-section part of the FAB-only shell (v10.2 spec §3): cards +
// per-category data. The shell (SectionBrowseLayout) owns the
// header/search/FAB and hands the ONE content stream a
// `SectionRenderContext`; this module owns:
//
//   • PodcastsDataProvider — calls `usePodcastsScreen` ONCE, above the
//     shell, so the single content stream reads the SAME per-scope cache
//     via context ("switching categories never refetches"). Sort is NOT
//     a provider prop: Podcast Index exposes no sort parameter, so
//     sorting is client-side in the content (Music pattern) and never
//     re-keys the cache. Also owns the podcast press handler (uses the
//     global `navigate` helper — content has no screen `navigation`).
//   • renderPodcastsContent — the config's `renderContent`: bridges the
//     shell's debounced `ctx.query` into the hook's `setSearchTerm`,
//     reads the active category from `ctx.options.filter` ('' → the
//     default "All" trending stream), sorts the loaded slice by
//     `ctx.options.sort`, then renders the PodcastRow list through
//     SectionContent's DATA MODE (states, pagination, gold RefreshControl
//     all shared).
//
// The old tab-view machinery was deleted from the screen — the shell owns
// all of it now.

import React, {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {
  usePodcastsScreen,
  sortPodcasts,
  MAX_RESULTS_PER_QUERY,
  type PodcastScopeState,
} from './hooks/usePodcastsScreen';
import {PODCAST_CATEGORIES} from '../../constants/podcastCategories';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {SectionContent, type SectionContentState} from '../sections/components/SectionContent';
import {navigate} from '../../navigation/navigationHelper';
import type {PodcastResult} from '../../types/api';
import type {SectionBrowseConfig, SectionRenderContext} from '../sections/sectionConfig';

// ─── Podcast Row ────────────────────────────────────────────────────────
// Single-column list row (the brand — no view group on this section):
//
//   [60×60 thumb]  Title (1 line)
//                  Author (secondary)
//                  [N ep.]          ›
//
// Thumb falls back to the `music` glyph in goldDim when the feed has no
// image or the load fails — consecutive rows never render as voids.

interface PodcastRowProps {
  item: PodcastResult;
  onPress: (item: PodcastResult) => void;
}

const PodcastRow: React.FC<PodcastRowProps> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!item.image && !imageFailed;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={[styles.row, {backgroundColor: colors.background.elevated}]}>
      {/* Thumb */}
      <View
        style={[
          styles.thumbWrap,
          {backgroundColor: colors.background.primary},
        ]}>
        {showImage ? (
          <FastImage
            source={{
              uri: item.image,
              priority: FastImage.priority.normal,
            }}
            style={styles.thumbImage}
            resizeMode={FastImage.resizeMode.cover}
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <SvgIcon name="music" size={22} color={colors.accent.goldDim} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
          {item.title}
        </AppText>
        {item.author ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.author}
          </AppText>
        ) : null}
        {item.episodeCount > 0 && (
          <View style={[styles.badge, {backgroundColor: colors.accent.goldDim}]}>
            <AppText
              variant="caption"
              style={[styles.badgeText, {color: colors.accent.gold}]}>
              {item.episodeCount} ep.
            </AppText>
          </View>
        )}
      </View>

      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});

// ─── Data provider (ONE cache above the shell) ──────────────────────────

interface PodcastsDataContextValue {
  isSearchActive: boolean;
  searchTerm: string;
  getScope: (categoryId: string) => PodcastScopeState;
  ensureLoaded: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
  refresh: (categoryId: string) => void;
  setSearchTerm: (term: string) => void;
  handlePodcastPress: (item: PodcastResult) => void;
}

const PodcastsDataContext = React.createContext<PodcastsDataContextValue | null>(
  null,
);

function usePodcastsData(): PodcastsDataContextValue {
  const ctx = React.useContext(PodcastsDataContext);
  if (!ctx) {
    throw new Error(
      'usePodcastsData must be used inside <PodcastsDataProvider>.',
    );
  }
  return ctx;
}

export const PodcastsDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (categoryId, searchTerm) scope cache via context.
  const podcasts = usePodcastsScreen();

  const handlePodcastPress = useCallback((item: PodcastResult) => {
    navigate('PodcastDetail', {
      podcastId: item.id,
      podcastTitle: item.title,
    });
  }, []);

  const value = useMemo<PodcastsDataContextValue>(
    () => ({
      isSearchActive: podcasts.isSearchActive,
      searchTerm: podcasts.searchTerm,
      getScope: podcasts.getScope,
      ensureLoaded: podcasts.ensureLoaded,
      loadMore: podcasts.loadMore,
      retry: podcasts.retry,
      refresh: podcasts.refresh,
      setSearchTerm: podcasts.setSearchTerm,
      handlePodcastPress,
    }),
    // Stabilize the context value: depend on each property individually
    // so the memo only invalidates when one of them actually changes,
    // not every render (`podcasts` is a fresh object each time) — the
    // Phase 5.2b fix that prevented re-render loops.
    [
      podcasts.isSearchActive,
      podcasts.searchTerm,
      podcasts.getScope,
      podcasts.ensureLoaded,
      podcasts.loadMore,
      podcasts.retry,
      podcasts.refresh,
      podcasts.setSearchTerm,
      handlePodcastPress,
    ],
  );

  return (
    <PodcastsDataContext.Provider value={value}>
      {children}
    </PodcastsDataContext.Provider>
  );
};

// ─── Content (the config's renderContent) ───────────────────────────────

const PodcastsContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
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
    handlePodcastPress,
  } = usePodcastsData();
  const {offline} = ctx;

  // Active category comes from the shell's FILTER selection — '' = the
  // default "All" stream (trending). The scope key is `${categoryId}|${term}`.
  // The shell models every filter as `string[]`; Podcasts is single-select,
  // so the active category is `[0]` (or '' when the group is cleared).
  const rawFilter = ctx.options.filter;
  const categoryId = Array.isArray(rawFilter)
    ? (rawFilter[0] ?? '')
    : (rawFilter ?? '');
  const categoryLabel =
    PODCAST_CATEGORIES.find(c => String(c.id) === categoryId)?.name ?? '';

  // Active sort key comes straight from the shell's SORT selection — same
  // record the FAB sheet writes. NOT part of the cache key: Podcast Index
  // has no server-side sort (Music pattern), so toggling sort only re-runs
  // the pure client-side `sortPodcasts` below — never a refetch.
  const sortKey = ctx.options.sort;

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load the first window for this combination on first mount / selection
  // change. Deps cover BOTH components of the scope cache key
  // `${categoryId}|${term}` — sort is deliberately absent (client-side,
  // never re-keys). The hook's hasLoaded/isLoading guard turns this into
  // a no-op for already-loaded scopes. Ref-stashed so the effect doesn't
  // re-fire when only ensureLoaded's identity changes (Phase 5.2b).
  const ensureLoadedRef = React.useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(categoryId);
  }, [categoryId, searchTerm]);

  const scope = getScope(categoryId);
  const {items, maxRequested, hasLoaded, isLoading, isLoadingMore, error} =
    scope;

  const state: SectionContentState =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error && items.length === 0
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';

  // Single-column list IS the brand — the shell has no `view` group here
  // (mirrors Movies forcing its grid). SectionContent's list math handles
  // the row layout automatically.
  const view: 'list' | 'grid' = 'list';

  // The FAB sort re-orders THIS stream's own loaded slice (the API
  // exposes no sort parameter). The memo deps make it live: sort changes
  // re-order instantly, and every load-more append re-sorts the full
  // array (spec §10.2 trap).
  const sortedItems = useMemo(
    () => sortPodcasts(items, sortKey),
    [items, sortKey],
  );

  // No more to fetch when the max window has hit the API cap with a full
  // result set, or the API returned fewer than requested (partial last
  // page). The footer flips to a terminal "caught up" state once here.
  const reachedEnd =
    hasLoaded &&
    !error &&
    (items.length < maxRequested ||
      maxRequested >= MAX_RESULTS_PER_QUERY);

  const refreshControl = {
    refreshing: isLoading,
    onRefresh: () => refresh(categoryId),
  };

  // In-flow footer (Movies parity): lives INSIDE the FlatList so it sits
  // glued to the last row. The Wrap reserves a FIXED minHeight across all
  // branches (loading / retry / caught-up / spacer) so switching state
  // never reflows the FlatList's bottom edge.
  const footerNode = (
    <View style={styles.footerWrap}>
      {isLoadingMore ? (
        <View style={styles.footerRow}>
          <ActivityOrb size={22} />
          <AppText variant="caption" color="secondary" style={styles.footerText}>
            Loading more…
          </AppText>
        </View>
      ) : !!error && hasLoaded ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => loadMore(categoryId)}
          style={[
            styles.loadMoreRetry,
            {borderColor: colors.background.highlight},
          ]}
          accessibilityRole="button">
          <AppText variant="caption" color="secondary">
            Couldn't load more — tap to retry
          </AppText>
        </TouchableOpacity>
      ) : reachedEnd ? (
        <AppText variant="caption" color="secondary" style={styles.footerText}>
          You're all caught up
        </AppText>
      ) : (
        // Idle spacer — same visual footprint as the active branches so
        // the FlatList's bottom edge doesn't jump as the footer toggles.
        <View style={styles.footerSpacer} />
      )}
    </View>
  );

  return (
    <View style={styles.sectionRoot}>
      {/* Centered loading pill — fires whenever the user is waiting for a
          fresh scope to resolve (initial mount OR applying a filter that
          hasn't been cached yet). Same orb + caption language as the
          footer. */}
      {!hasLoaded && isLoading ? (
        <View style={styles.centerLoader} pointerEvents="none">
          <View
            style={[
              styles.centerLoaderPill,
              {backgroundColor: colors.background.elevated},
            ]}>
            <ActivityOrb size={24} />
            <AppText
              variant="caption"
              color="secondary"
              style={styles.centerLoaderText}>
              Loading podcasts…
            </AppText>
          </View>
        </View>
      ) : (
        <>
          {/* Pull-to-refresh on a loaded scope: items stay visible
              underneath while a floating pill confirms the refresh is
              in-flight. */}
          {hasLoaded && isLoading ? (
            <View style={styles.refreshPillWrap} pointerEvents="none">
              <View
                style={[
                  styles.refreshPill,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <ActivityOrb size={20} />
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.refreshPillText}>
                  Refreshing…
                </AppText>
              </View>
            </View>
          ) : null}
          {/* If items are empty AND we're loading (filter applied while
              prior items were for a different scope, search re-running,
              etc.), the centered pill stays on — it floats over whatever
              SectionContent shows. */}
          {items.length === 0 && isLoading ? (
            <View style={styles.centerLoader} pointerEvents="none">
              <View
                style={[
                  styles.centerLoaderPill,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <ActivityOrb size={24} />
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.centerLoaderText}>
                  Loading podcasts…
                </AppText>
              </View>
            </View>
          ) : null}
          <SectionContent
            state={state}
            error={{
              // Offline-aware copy: the global OfflineBanner already says
              // we're offline — the ErrorState just confirms the retry
              // path instead of showing a misleading network message.
              title: offline ? "You're offline" : undefined,
              message: offline
                ? 'Check your connection and try again.'
                : "Couldn't load podcasts.",
            }}
            empty={{
              icon: isSearchActive ? 'search' : 'micVocal',
              title: isSearchActive
                ? 'No podcasts match your search.'
                : categoryId === 'all'
                ? 'No podcasts found here.'
                : `No podcasts found in ${categoryLabel}.`,
              suggestion: isSearchActive
                ? 'Try a different search term.'
                : 'Try another category.',
            }}
            onRetry={() => retry(categoryId)}
            {...refreshControl}
            data={sortedItems}
            renderItem={({item}) => (
              <PodcastRow item={item} onPress={handlePodcastPress} />
            )}
            keyExtractor={item => String(item.id)}
            view={view}
            // Pad the bottom so the last row can scroll fully above the
            // floating SectionFab (56px tall, bottom-anchored at
            // insets.bottom + spacing.lg in SectionFab) plus a breathing
            // gap (Music parity — same single-column geometry).
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md,
            }}
            route="PodcastsScreen"
            onEndReached={() => loadMore(categoryId)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={footerNode}
          />
        </>
      )}
    </View>
  );
};

/** The Podcasts `renderContent` — wired into SECTION_CONFIGS.PodcastsScreen. */
export const renderPodcastsContent: SectionBrowseConfig['renderContent'] =
  ctx => <PodcastsContent ctx={ctx} />;

// ─── Styles ─────────────────────────────────────────────────────────────
// Card + footer styles only — the list container math is owned by
// SectionContent (Phase 4.3 parity: 16px edge / 8px col gap / 16px row gap).

const styles = StyleSheet.create({
  sectionRoot: {
    flex: 1,
  },
  // ── Row ───────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: {
    width: 60,
    height: 60,
  },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  badgeText: {fontSize: 11, fontWeight: '700'},
  // ── In-flow footer (Movies parity) ────────────────────────────────
  footerWrap: {
    // `minHeight` pins the slot's geometry across all branches
    // (spacer / loading / caught-up), so switching state never reflows
    // the FlatList's bottom edge.
    paddingVertical: spacing.md,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {
    // Height identical to `footerRow`'s visual footprint so the bottom
    // edge doesn't jump as the footer state toggles.
    height: 28,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    opacity: 0.85,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // ── Overlay pills ─────────────────────────────────────────────────
  centerLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Anchor the pill at ~20% from the top of the list area so it reads
    // as a status pill, not a splash-screen placeholder.
    justifyContent: 'flex-start',
    paddingTop: '20%',
    zIndex: 10,
  },
  centerLoaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  centerLoaderText: {
    opacity: 0.85,
  },
  refreshPillWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // Soft elevation so the pill reads as floating above the cards.
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  refreshPillText: {
    opacity: 0.85,
  },
});