// ─── Movie Browser Content (v10 Wave 5 → v10.1 Wave 6 de-tab) ───────────
// The per-section part of the unified shell (spec §5): cards + per-category
// data. The shell (SectionBrowseLayout) owns the header/search/FAB and
// hands the ONE content stream a `SectionRenderContext`; this module owns:
//
//   • MoviesDataProvider — calls `useMoviesScreenParams` ONCE, above the
//     shell, so the single content stream shares ONE per-scope cache (the
//     legacy "switching categories never refetches" behavior). The active
//     `sortKey` arrives as a prop from the screen (composition root), so
//     changing "sort by" re-fetches page 1 with IA's server-side order.
//     It also owns the per-movie resolution state + press handler (uses
//     the global `navigate` helper — content has no screen `navigation`).
//   • renderMoviesContent — the config's `renderContent`: bridges the
//     shell's debounced `ctx.query` into the hook's `setSearchTerm`, reads
//     the active category from `ctx.options.filter` ('' → the default
//     "All" stream), then renders the single-column MovieCard list through
//     SectionContent's DATA MODE (states, pagination, testID, gold
//     RefreshControl all shared).
//
// The old header/search/tab/viewpager code was deleted from the screen —
// the shell owns all of it now.

import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Animated, View, TouchableOpacity, StyleSheet, type ImageSourcePropType} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {
  useMoviesScreenParams,
  type MovieScopeState,
} from './hooks/useMoviesScreen';
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
} from '../sections/sectionConfig';

// ─── Movie Card ─────────────────────────────────────────────────────────
// Premium 2-col 16:9 hero card (Apple TV+ / Prime Video style):
//
//   ┌───────────────────────────┐
//   │                           │
//   │    full-bleed image       │
//   │                           │
//   │  ── scrim gradient ──     │  ← LinearGradient: transparent →
//   │  Title line               │     scrimOpaque from ~40% down
//   │  year · creator           │
//   └───────────────────────────┘
//
// The image IS the card — no surface, no border, no badges. Metadata
// (rating, duration) deliberately drops OUT here and will live on the
// upcoming detail/action sheet. Title + year + creator are the only
// payload on the card. Quick scan from a wall of cards, single tap to
// play. NumberOfLines is tightly clamped so layout is identical for
// every item regardless of title length.

interface MovieCardProps {
  item: InternetArchiveVideoResult;
  onPress: (item: InternetArchiveVideoResult) => void;
  isResolving?: boolean;
  /** Category cover image — used as a fallback when the IA item has no
   *  `imageUrl` so consecutive empty cards don't render as visual voids.
   *  Prevents the "two empty cards next to each other look broken"
   *  rhythm problem the placeholder/gradient gap exposed in the grid. */
  placeholderImage?: ImageSourcePropType;
  /** When true, this card is the sole item in its row (odd item count).
   *  Renders at an explicit 50% width via `heroCardLonely` instead of
   *  `heroCard` (which uses `flex: 1` to claim half the row). Without
   *  this, a single trailing item stretches to full screen width and
   *  looks like a giant banner inside the grid. */
  isLonelyItem?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({item, onPress, isResolving, placeholderImage, isLonelyItem}) => {
    const {colors} = useTheme();
    // Local "image failed" state so we can fall back to the placeholder
    // instead of the broken-image icon. `imageUrl` comes from the IA
    // search API with a fallback to `https://archive.org/services/img/{id}`
    // (verified to return a 200 image/jpeg for every item).
    const [imageFailed, setImageFailed] = useState(false);
    // Cross-fade animation: every card starts at the same visual state
    // (cover image underneath) and fades its remote image in once loaded.
    // This makes two adjacent cards with differing load times look
    // consistent — every cell shows the category cover while waiting,
    // so empty cells never collapse to a dark void mid-scroll.
    const imageOpacity = useRef(new Animated.Value(0)).current;
    // Stack of layered images, back to front:
    //   Layer 1  base  — cover image (always) or brand placeholder
    //                    (only if no cover); renders synchronously and
    //                    is what the user sees during load and on error.
    //   Layer 2  remote — present ONLY when the item has an imageUrl AND
    //                    the load hasn't failed yet; opacity 0 → 1 on
    //                    load, covering the base layer.
    const hasRemoteAttempt = !!item.imageUrl;
    const remoteActive = hasRemoteAttempt && !imageFailed;
    const hasCover = !!placeholderImage;
    // Pre-build the meta row string so JSX stays compact + viewable.
    // Both fields optional → render conditionally below.
    const meta =
      item.year && item.creator
        ? `${item.year}  ·  ${item.creator}`
        : item.year ?? item.creator ?? '';

    const handleImageLoad = useCallback(() => {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 220,
        // opacity animation → safe on native driver
        useNativeDriver: true,
      }).start();
    }, [imageOpacity]);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        disabled={isResolving}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${meta ? `, ${meta}` : ''}`}
        style={isLonelyItem ? styles.heroCardLonely : styles.heroCard}>
        {/* Image layer — two stacked layers.
             Layer 1 (base): always present — category cover if available,
             otherwise the gradient + clapperboard brand placeholder.
             This is what the user sees DURING load and ON error, so
             cells never collapse to a dark void while waiting.
             Layer 2 (remote): renders ON TOP of the base only when an
             item has an imageUrl and the load hasn't failed. Starts at
             opacity 0 and fades to 1 on load, covering the base. */}
        <View style={[styles.heroImageLayer, {backgroundColor: colors.background.primary}]}>
          {hasCover ? (
            <FastImage
              source={placeholderImage as unknown as number}
              style={StyleSheet.absoluteFill}
              resizeMode={FastImage.resizeMode.cover}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(28, 26, 22, 1)',
                  'rgba(14, 13, 11, 1)',
                  'rgba(0, 0, 0, 1)',
                ]}
                locations={[0, 0.5, 1]}
                style={styles.heroPlaceholderGradient}
              />
              <SvgIcon
                name="clapperboard"
                size={56}
                color={colors.accent.gold}
                style={styles.heroPlaceholderIcon}
              />
            </View>
          )}
          {remoteActive ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, {opacity: imageOpacity}]}>
              <FastImage
                source={{uri: item.imageUrl, priority: FastImage.priority.normal}}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
                onLoad={handleImageLoad}
                onError={() => setImageFailed(true)}
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          ) : null}
          {/* Resolving state — centered spinner over the image. */}
          {isResolving ? (
            <View style={[StyleSheet.absoluteFill, styles.heroResolving]}>
              <ActivityOrb size={36} />
            </View>
          ) : null}
        </View>

        {/* LinearGradient overlay covering the bottom 62% of the card —
            provides guaranteed legibility with a SOFT top edge so the
            image bleeds smoothly into the dark text region. Replaces
            the full-card gradient + solid strip from earlier iterations
            — fewer layers, cleaner fade, single source of truth for
            the overlay region. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(8, 8, 10, 0)',
            'rgba(8, 8, 10, 0.78)',
            'rgba(8, 8, 10, 0.95)',
          ]}
          locations={[0, 0.5, 1]}
          style={styles.heroOverlayBg}
        />

        {/* Text overlay — bottom-left, breathing room inside the scrim. */}
        <View style={styles.heroOverlay} pointerEvents="none">
          <AppText
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.heroTitle}>
            {item.title}
          </AppText>
          {meta ? (
            <AppText
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.heroMeta}>
              {meta}
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
  /** Hook-synced search term (drives the per-scope cache key). */
  searchTerm: string;
  getScope: (categoryIds: readonly string[]) => MovieScopeState;
  ensureLoaded: (categoryIds: readonly string[]) => void;
  loadMore: (categoryIds: readonly string[]) => void;
  retry: (categoryIds: readonly string[]) => void;
  refresh: (categoryIds: readonly string[]) => void;
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
  children: ReactNode;
  /** Active sort key (undefined = IA default). Fed from the screen's
   *  `optionsApi` — changing it re-keys the scope cache and re-fetches
   *  page 1 in the new server-side order. */
  sortKey?: string;
}> = ({children, sortKey}) => {
  const toast = useToast();
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (categoryIds, searchTerm, sortKey) scope cache via
  // context.
  const movies = useMoviesScreenParams({categoryIds: [], sortKey});

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
      searchTerm: movies.searchTerm,
      getScope: movies.getScope,
      ensureLoaded: movies.ensureLoaded,
      loadMore: movies.loadMore,
      retry: movies.retry,
      refresh: movies.refresh,
      setSearchTerm: movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    }),
    // Stabilize the context value: depend on each individual property
    // so the memo only invalidates when one of them actually changes,
    // not every time `movies` (a fresh object) is returned from the hook.
    // Without this, every provider render gives the consumer a new
    // `ensureLoaded` ref, re-firing the mount effect (Phase 5.2b).
    [
      movies.isSearchActive,
      movies.searchTerm,
      movies.getScope,
      movies.ensureLoaded,
      movies.loadMore,
      movies.retry,
      movies.refresh,
      movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    ],
  );

  return (
    <MoviesDataContext.Provider value={value}>
      {children}
    </MoviesDataContext.Provider>
  );
};

// ─── Content (the config's renderContent) ───────────────────────────────

const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
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
    resolvingId,
    handleMoviePress,
  } = useMoviesData();
  const {offline} = ctx;

  // Active categories come from the shell's FILTER selection — a
  // string[] (multi-select). Empty array → the default "All" stream
  // (`['all']`).
  const rawFilter = ctx.options.filter;
  const categoryIds: readonly string[] = React.useMemo(() => {
    if (rawFilter && rawFilter.length > 0) return rawFilter;
    return ['all'];
  }, [rawFilter]);

  // Active sort key comes straight from the shell's SORT selection —
  // same record the FAB sheet writes. It feeds `MoviesDataProvider`'s
  // `sortKey` prop (via the screen), which re-keys the scope cache; the
  // effect below re-fires page 1 in the new IA server-side order.
  const sortKey = ctx.options.sort;

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load page 1 for this combination on first mount / selection change.
  // The hook's hasLoaded/isLoading guard turns this into a no-op for
  // already-loaded scopes, so it's safe to fire on every change. Deps
  // cover ALL three components of the scope cache key
  // `<sorted ids>|<term>|<sortKey>` — a new sort or search term re-keys
  // the cache and must trigger the page-1 load. We use a ref-stash so the
  // effect doesn't re-fire when only ensureLoaded's identity changes
  // (Phase 5.2b).
  const ensureLoadedRef = React.useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(categoryIds);
  }, [categoryIds, searchTerm, sortKey]);

  const scope = getScope(categoryIds);
  const {items, numFound, hasLoaded, isLoading, isLoadingMore, error} = scope;

  const state: SectionContentState =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error && items.length === 0
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';

  // v10.3 Movies: 2-col 16:9 hero grid (Apple TV+ / Prime Video parity).
  // The shell's `view` group is intentionally absent on this section —
  // the layout IS the brand. SectionContent's grid math handles the
  // 2-col layout, gap rhythm, and remount key automatically.
  const view: 'list' | 'grid' = 'grid';
  const category = MOVIE_CATEGORIES.find(c => c.id === categoryIds[0]);

  // No client-side sort — IA owns the order via `sort[]` (see
  // `sortParamFor` in the hook). Pagination just appends the next page;
  // the server already returned it in the correct order. KISS.

  // Reached the end of the result set — every item IA reported (numFound)
  // is loaded, so nothing more can be fetched. Once here the footer flips
  // from "loading" to a terminal "caught up" state.
  const reachedEnd =
    hasLoaded && !error && numFound > 0 && items.length >= numFound;

  // Footer strategy: lives INSIDE the FlatList (ListFooterComponent).
  // The Wrap reserves a FIXED minHeight at all times so:
  //   1. While the user scrolls near the end, the FlatList always has
  //      something visible BELOW the last row — the spinner or text sits
  //      in a 56px reserved slot, never below the viewport.
  //   2. Switching between loading / retry / caught-up / spacer does NOT
  //      reflow the FlatList; the bottom edge stays put.
  //
  // No absolute overlay anymore — the previous iteration introduced a
  // "sticky" bottom-anchored loader, but absolute siblings inside the
  // scroll container drift when content scrolls, producing a noticeable
  // gap below the list. The in-flow footer is the only pattern that
  // genuinely sits glued to the last row.
  const refreshControl = {
    refreshing: isLoading,
    onRefresh: () => refresh(categoryIds),
  };

  // The footer node — always 56px tall so the FlatList reserves its
  // own vertical footprint regardless of which branch renders.
  const footerNode = (
    <View style={styles.gridFooterWrap}>
      {isLoadingMore ? (
        <View style={styles.gridFooterRow}>
          <ActivityOrb size={22} />
          <AppText
            variant="caption"
            color="secondary"
            style={styles.gridFooterText}>
            Loading more…
          </AppText>
        </View>
      ) : !!error && hasLoaded ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => loadMore(categoryIds)}
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
        <AppText
          variant="caption"
          color="secondary"
          style={styles.gridFooterText}>
          You're all caught up
        </AppText>
      ) : (
        // Idle spacer — same height as the active branches via the
        // Wrap's minHeight, so toggling between branches does not
        // reflow the FlatList.
        <View style={styles.gridFooterSpacer} />
      )}
    </View>
  );

  return (
    <View style={styles.sectionRoot}>
      {/* Centered loading affordance — fires whenever the user is
          waiting for a fresh scope to resolve (initial mount OR
          applying a filter that hasn't been cached yet). This
          replaces the shared skeleton grid whenever items.length===0
          and isLoading is true, so no empty area can render silently.
          Uses the same orb + caption language as the grid footer. */}
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
              Loading movies…
            </AppText>
          </View>
        </View>
      ) : (
        <>
          {/* Pull-to-refresh on a loaded scope: items stay visible
              underneath while a floating pill confirms the refresh is
              in-flight. Disappears the moment the new page swaps in. */}
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
              prior items were for a different scope, search produced 0
              and is re-running, etc.), the centered pill stays on —
              it floats over whatever SectionContent shows. Without
              this, ListEmptyComponent would render with no spinner
              feedback, looking like the section is broken. */}
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
                  Loading movies…
                </AppText>
              </View>
            </View>
          ) : null}
          <SectionContent
            state={state}
      error={{
        // Offline-aware copy: the global OfflineBanner already says we're
        // offline — the ErrorState just confirms the retry path instead of
        // showing a misleading network message.
        title: offline ? "You're offline" : undefined,
        message: offline
          ? 'Check your connection and try again.'
          : "Couldn't load movies.",
      }}
      empty={{
        icon: isSearchActive ? 'search' : 'folder',
        title: isSearchActive
          ? 'No movies match your search.'
          : 'No movies found in this category.',
        suggestion: isSearchActive
          ? 'Try a different search term.'
          : 'Try another category.',
      }}
      onRetry={() => retry(categoryIds)}
      {...refreshControl}
      data={items}
      keyExtractor={item => item.identifier}
      view={view}
      // Full-bleed grid — zero gap and zero row spacing so the cards
      // butt against each other and the screen edge. Override must be
      // complete (not partial) because SectionContent REPLACES its
      // default `columnWrapperStyle` when the override is supplied.
      // `placeholderImage` (the active category's cover) is the visual
      // fallback for cards whose IA item has no `imageUrl` — prevents
      // 2+ consecutive empty cells from reading as a broken grid.
      // `isLonelyItem` flags the sole trailing card (odd item count)
      // so it renders at explicit 50% width instead of stretching to
      // full screen via `flex: 1`.
      renderItem={({item, index}) => {
        const isLonelyItem =
          index === items.length - 1 && items.length % 2 !== 0;
        return (
          <MovieCard
            item={item}
            placeholderImage={category?.image}
            onPress={handleMoviePress}
            isResolving={resolvingId === item.identifier}
            isLonelyItem={isLonelyItem}
          />
        );
      }}
      columnWrapperStyle={{
        gap: 0,
        marginBottom: 0,
      }}
      // Zero outer padding on every axis EXCEPT the bottom — cards reach
      // both side edges of the screen (full-bleed), and only the bottom
      // is padded so the FAB never sits on top of the last row. The
      // footer lives IN the FlatList and is glued to the last row, so
      // there is no separate gap between content and footer. The big
      // +56 / +lg / +md for FAB clearance is removed because the footer
      // IS the bottom gap now.
      contentContainerStyle={{
        padding: 0,
        paddingBottom: insets.bottom + spacing.md,
      }}
      route="MoviesScreen"
      // v10.3: no header subtext under the chips. The previous
      // category-description caption ("The birth of cinema" etc.) sat
      // directly under the chip row and visually competed with it as a
      // second tier of metadata. Removed — the active chip itself now
      // communicates the selection; the FlatList flows straight into
      // the grid.
      ListHeaderComponent={null}
      ListFooterComponent={footerNode}
      // Lower threshold (0.35) so pagination kicks in BEFORE the user
      // reaches the visual bottom of the list — at 0.6 the trigger waited
      // until the user was almost off-screen, then jumped to a new page,
      // which read as a sudden append with no spinner. Triggering earlier
      // means the "Loading more…" footer is visible the moment the user
      // scrolls near the end and the next page fills in gracefully.
      onEndReached={() => loadMore(categoryIds)}
      onEndReachedThreshold={0.35}
    />
        </>
      )}
    {/* No absolute overlay here — the in-flow footer above is the only
        pagination UI. The previous "sticky" overlay iteration drifted
        relative to the FlatList (visible gap below the list) and has been
        removed; the in-flow pattern sits flush with the last row. */}
    </View>
  );
};
/** The Movies `renderContent` — wired into SECTION_CONFIGS.MoviesScreen. */
export const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

// ─── Styles ─────────────────────────────────────────────────────────────
// Card + footer styles only — the grid/list container math is owned by
// SectionContent (Phase 4.3 parity: 16px edge / 8px col gap / 16px row gap).

const styles = StyleSheet.create({
  gridFooterWrap: {
    // In-flow footer — lives INSIDE the FlatList (ListFooterComponent)
    // so it sits directly under the last row, never wandering when the
    // list scrolls. `minHeight` pins the slot's geometry across all
    // branches (spacer / loading / caught-up), so switching from one
    // state to another never reflows the FlatList's scroll position.
    paddingVertical: spacing.md,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFooterSpacer: {
    // Height kept identical to `gridFooterRow`'s visual footprint so
    // the FlatList's bottom edge doesn't jump as the footer state
    // toggles between loading / retry / caught-up.
    height: 28,
  },
  gridFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Footer text — explicit visible color so the loader / "caught up"
  // caption is never collapsed to invisible. `secondary` is the
  // app's soft on-surface text token and is guaranteed to contrast on
  // the screen background.
  gridFooterText: {
    opacity: 0.85,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // Section root — wraps SectionContent only. The footer is a
  // ListFooterComponent now, so the FlatList already reserves its
  // own height and no overlay layer is needed.
  sectionRoot: {
    flex: 1,
  },
  // ── Centered loading / refreshing pills ────────────────────────────────
  // Same orb + caption language as the grid footer for consistency,
  // but centered and floating over the content area. Used for two
  // cases: initial mount (no data yet) and pull-to-refresh on an
  // already-loaded scope (items stay visible underneath).
  centerLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Anchor the pill at ~20% from the top of the list area instead
    // of dead-center so it reads as a status pill (perceived as
    // "working near the top"), not as a splash-screen placeholder
    // (which sits at 50% and blocks content preview entirely).
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
  // ── 16:9 hero card ──────────────────────────────────────────────────
  // Square-edge full-bleed mosaic (Apple Photos / Spotify album grid
  // parity): zero gap, zero outer padding, zero radius, zero shadow.
  // Cards sit perfectly flush against each other and the screen edge,
  // reading as one continuous image grid rather than discrete "cards".
  //
  // Two variants:
  //   • heroCard       — flex: 1, claims half the row (the common case)
  //   • heroCardLonely — explicit 50% width, used when the card is the
  //                       sole item in its row (odd item count). Without
  //                       this, the lone trailing item would stretch to
  //                       full screen width and read as a giant banner.
  heroCard: {
    // `flex: 1` so each row child claims half the row width.
    flex: 1,
    aspectRatio: 16 / 9,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroCardLonely: {
    width: '50%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroImageLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroPlaceholder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  heroPlaceholderIcon: {
    opacity: 0.4,
  },
  heroResolving: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // LinearGradient overlay region — the bottom 62% of the card.
  // Positioned absolute so the image layer behind it shows through
  // above, then fades into a near-opaque dark for the text region.
  // The gradient itself is supplied inline (3-color stops) so the
  // legibility guarantees live next to the component, not in a
  // distant token file.
  heroOverlayBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
  },
  // Bottom-anchored text overlay. Sized to leave the upper image area
  // visible while keeping the title/meta legible on bright covers.
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.1,
    // Subtle shadow ensures the title stays legible on bright covers
    // even before the scrim dominates the bottom 30%.
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 6,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
});
