// ─── Movie Browser Content (v10 Wave 5 pilot) ───────────────────────────
// The per-section part of the unified shell (spec §5): cards + per-category
// data. The shell (SectionBrowseLayout) owns the header/search/tabs/FAB and
// hands every tab a `SectionRenderContext`; this module owns:
//
//   • MoviesDataProvider — calls `useMoviesScreen` ONCE, above the shell,
//     so every lazily-mounted tab scene shares ONE per-scope cache (the
//     legacy "toggle tabs never refetches" behavior). It also owns the
//     per-movie resolution state + press handler (uses the global
//     `navigate` helper — renderTab content has no screen `navigation`).
//   • renderMoviesTab — the config's `renderTab`: bridges the shell's
//     debounced `ctx.query` into the hook's `setSearchTerm`, then renders
//     the real 2-col MovieCard grid through SectionContent's DATA MODE
//     (states, pagination, testID, gold RefreshControl all shared).
//
// The old header/search/tab/viewpager code was deleted from the screen —
// the shell owns all of it now.

import React, {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {useMoviesScreen, type MovieScopeState} from './hooks/useMoviesScreen';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {useToast} from '../../components/feedback/Toast';
import {SectionContent, type SectionContentState} from '../sections/components/SectionContent';
import {navigate} from '../../navigation/navigationHelper';
import {resolveInternetArchiveVideoDetails} from '../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../types/api';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
  SectionTab,
} from '../sections/sectionConfig';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

// ─── Movie Card ─────────────────────────────────────────────────────────

interface MovieCardProps {
  item: InternetArchiveVideoResult;
  onPress: (item: InternetArchiveVideoResult) => void;
  isResolving?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({item, onPress, isResolving}) => {
    const {colors} = useTheme();
    // Local "image failed" state so we can fall back to the placeholder
    // instead of the broken-image icon. `imageUrl` comes from the IA
    // search API with a fallback to `https://archive.org/services/img/{id}`
    // (verified to return a 200 image/jpeg for every item).
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !!item.imageUrl && !imageFailed;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        disabled={isResolving}
        accessibilityRole="button"
        style={styles.movieCard}>
        <View
          style={[
            styles.thumbnailWrap,
            {backgroundColor: colors.background.elevated},
          ]}>
          {/* FastImage — explicit width/height style is required, see
              styles.thumbnail (absoluteFillObject was rendering 0×0). */}
          {showImage ? (
            <FastImage
              source={{uri: item.imageUrl, priority: FastImage.priority.normal}}
              style={styles.thumbnail}
              resizeMode={FastImage.resizeMode.cover}
              onError={() => setImageFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <SvgIcon name="video" size={24} color={colors.accent.goldDim} />
            </View>
          )}
          {/* Resolving overlay — shows while we fetch the real file URL */}
          {isResolving && (
            <View
              style={[
                styles.thumbnailWrap,
                styles.resolvingOverlay,
                {backgroundColor: 'rgba(0,0,0,0.35)'},
              ]}>
              <ActivityOrb size={36} />
            </View>
          )}
          {/* Duration badge */}
          {item.duration > 0 && (
            <View
              style={[
                styles.durationBadge,
                {backgroundColor: colors.background.scrimMid},
              ]}>
              <AppText
                variant="caption"
                style={[styles.durationText, {color: colors.text.bright}]}>
                {formatDuration(item.duration)}
              </AppText>
            </View>
          )}
          {/* Rating badge */}
          {item.avgRating > 0 && (
            <View
              style={[
                styles.ratingBadge,
                {backgroundColor: colors.background.scrimMid},
              ]}>
              <AppText
                variant="caption"
                style={[styles.ratingText, {color: colors.accent.gold}]}>
                ★ {item.avgRating.toFixed(1)}
              </AppText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.movieInfo}>
          <AppText variant="bodySmall" numberOfLines={2} style={styles.movieTitle}>
            {item.title}
          </AppText>
          {item.year ? (
            <AppText variant="caption" color="secondary">
              {item.year}
            </AppText>
          ) : null}
          {item.creator ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {item.creator}
            </AppText>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Data provider (ONE cache above the shell) ──────────────────────────

interface MoviesDataContextValue {
  isSearchActive: boolean;
  getScope: (categoryId: string) => MovieScopeState;
  ensureLoaded: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
  setSearchTerm: (term: string) => void;
  resolvingId: string | null;
  handleMoviePress: (item: InternetArchiveVideoResult) => void;
}

const MoviesDataContext = React.createContext<MoviesDataContextValue | null>(
  null,
);

function useMoviesData(): MoviesDataContextValue {
  const ctx = React.useContext(MoviesDataContext);
  if (!ctx) {
    throw new Error('useMoviesData must be used inside <MoviesDataProvider>.');
  }
  return ctx;
}

export const MoviesDataProvider: React.FC<{
  initialCategoryId?: string;
  children: ReactNode;
}> = ({initialCategoryId, children}) => {
  const toast = useToast();
  // Single hook instance for the whole screen — every tab scene reads the
  // SAME (category, searchTerm) scope cache via context (Wave 5 step 5).
  const movies = useMoviesScreen(initialCategoryId);

  // Per-movie resolution state. Failures surface as a top-of-screen toast
  // (auto-dismiss + close button) rather than an inline banner — same
  // pattern as the rest of the app.
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // Validate the URL *before* navigating into the player: retry the
      // metadata API up to 3 times (toast on each switch) and refuse to
      // navigate if the URL is still bad — surface a toast instead.
      setResolvingId(item.identifier);
      try {
        const details = await resolveInternetArchiveVideoDetails(
          item.identifier,
          (attempt, max) => {
            toast.show(
              `Trying alternate server… (attempt ${attempt}/${max})`,
              'info',
              {duration: 1800},
            );
          },
        );
        if (!details || details.streamingUrl.endsWith('/')) {
          toast.show(
            'No Video File — this item does not have a playable video file. Please try a different movie.',
            'error',
            {duration: 6000},
          );
          return;
        }
        navigate('VideoPlayer', {
          fileUri: details.streamingUrl,
          fileTitle: item.title,
          startPosition: 0,
        });
      } catch (err) {
        const detail =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to fetch the video file. Please try again.';
        toast.show(`Unable to Load — ${detail}`, 'error', {duration: 6000});
      } finally {
        setResolvingId(null);
      }
    },
    [toast],
  );

  const value = useMemo<MoviesDataContextValue>(
    () => ({
      isSearchActive: movies.isSearchActive,
      getScope: movies.getScope,
      ensureLoaded: movies.ensureLoaded,
      loadMore: movies.loadMore,
      retry: movies.retry,
      setSearchTerm: movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    }),
    [movies, resolvingId, handleMoviePress],
  );

  return (
    <MoviesDataContext.Provider value={value}>
      {children}
    </MoviesDataContext.Provider>
  );
};

// ─── Per-tab content (the config's renderTab) ───────────────────────────

const MoviesTabContent: React.FC<{
  tab: SectionTab;
  ctx: SectionRenderContext;
}> = ({tab, ctx}) => {
  const {colors} = useTheme();
  const {
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    isSearchActive,
    setSearchTerm,
    resolvingId,
    handleMoviePress,
  } = useMoviesData();

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field (Wave 5 step 5).
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load page 1 for this category on first mount (lazy scenes mount once;
  // the per-scope cache makes revisits instant). Refires when the search
  // term changes because `ensureLoaded`'s identity depends on it — the
  // hook's loaded/loading guard makes that a no-op for cached scopes.
  useEffect(() => {
    ensureLoaded(tab.key);
  }, [tab.key, ensureLoaded]);

  const scope = getScope(tab.key);
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

  // Legacy parity: initial load → loading; page-1 failure → error; loaded
  // with zero results → empty; otherwise the grid. Load-more errors keep
  // showing the grid with a tap-to-retry footer (see below).
  const state: SectionContentState =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error && items.length === 0
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';

  const view = ctx.options.view === 'list' ? 'list' : 'grid';
  const category = MOVIE_CATEGORIES.find(c => c.id === tab.key);

  // Load-more footer only in the ready state (page-1 failures render the
  // shared ErrorState in the empty slot instead — no double error UI).
  const showFooter = isLoadingMore || (!!error && hasLoaded);

  return (
    <SectionContent
      state={state}
      error={{message: "Couldn't load movies."}}
      empty={{
        icon: isSearchActive ? 'search' : 'folder',
        title: isSearchActive
          ? 'No movies match your search.'
          : 'No movies found in this category.',
        suggestion: isSearchActive
          ? 'Try a different search term.'
          : 'Try another category.',
      }}
      onRetry={() => retry(tab.key)}
      data={items}
      renderItem={({item}) => (
        <MovieCard
          item={item}
          onPress={handleMoviePress}
          isResolving={resolvingId === item.identifier}
        />
      )}
      keyExtractor={item => item.identifier}
      view={view}
      route="MoviesScreen"
      tabKey={tab.key}
      ListHeaderComponent={
        <AppText variant="caption" color="tertiary" style={styles.categoryDesc}>
          {category?.description ?? tab.title}
        </AppText>
      }
      onEndReached={() => loadMore(tab.key)}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        showFooter ? (
          <View style={styles.gridFooter}>
            {isLoadingMore ? (
              <View style={styles.gridFooterRow}>
                <ActivityOrb size={22} />
                <AppText variant="caption" color="tertiary">
                  Loading more…
                </AppText>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => loadMore(tab.key)}
                style={[
                  styles.loadMoreRetry,
                  {borderColor: colors.background.highlight},
                ]}
                accessibilityRole="button">
                <AppText variant="caption" color="secondary">
                  Couldn't load more — tap to retry
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : null
      }
    />
  );
};

/** The Movies `renderTab` — wired into SECTION_CONFIGS.MoviesScreen. */
export const renderMoviesTab: SectionBrowseConfig['renderTab'] = (tab, ctx) => (
  <MoviesTabContent tab={tab} ctx={ctx} />
);

// ─── Styles ─────────────────────────────────────────────────────────────
// Card + footer styles only — the grid/list container math is owned by
// SectionContent (Phase 4.3 parity: 16px edge / 8px col gap / 16px row gap).

const styles = StyleSheet.create({
  categoryDesc: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    opacity: 0.8,
  },
  gridFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  gridFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  movieCard: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  // Actual image style. Fills the wrapper, sits behind the duration/
  // rating badges (z-order from JSON position). Explicit width/height is
  // required — absoluteFillObject renders 0×0 in this layout.
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  resolvingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  movieInfo: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  movieTitle: {
    fontWeight: '600',
    lineHeight: 16,
  },
});
