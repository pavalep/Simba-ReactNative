// ─── Movie Browser Screen ──────────────────────────────────────────────
// Non-tech-savvy UX: pre-built categories, no search bar.
// Tap a category → see results grid → tap a movie → play.

import React, {useCallback, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useMoviesScreen} from './hooks/useMoviesScreen';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {getInternetArchiveVideoDetails, resolveInternetArchiveVideoDetails} from '../../services/api/internetArchiveService';
import {useToast} from '../../components/feedback/Toast';
import type {InternetArchiveVideoResult} from '../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

// ─── Category Chip ──────────────────────────────────────────────────────

interface CategoryChipProps {
  category: (typeof MOVIE_CATEGORIES)[number];
  isSelected: boolean;
  onPress: (id: string) => void;
}

const CategoryChip: React.FC<CategoryChipProps> = React.memo(
  ({category, isSelected, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(category.id)}
        accessibilityRole="button"
        accessibilityState={{selected: isSelected}}
        style={[
          styles.chip,
          {
            backgroundColor: isSelected
              ? colors.accent.gold
              : colors.background.elevated,
            borderColor: isSelected
              ? colors.accent.gold
              : colors.background.highlight,
          },
        ]}>
        <SvgIcon
          name={category.icon as any}
          size={14}
          color={isSelected ? colors.text.inverse : colors.text.secondary}
        />
        <AppText
          variant="button"
          style={[
            styles.chipText,
            {color: isSelected ? colors.text.inverse : colors.text.secondary},
          ]}>
          {category.name}
        </AppText>
      </TouchableOpacity>
    );
  },
);

// ─── Movie Card ─────────────────────────────────────────────────────────

interface MovieCardProps {
  item: InternetArchiveVideoResult;
  onPress: (item: InternetArchiveVideoResult) => void;
  isResolving?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({item, onPress, isResolving}) => {
    const {colors} = useTheme();
    // V6 2.3.2: local "image failed" state so we can fall back to the
    // placeholder instead of the broken-image icon. `imageUrl` comes
    // from the IA search API (image_url field) with a fallback to
    // `https://archive.org/services/img/{identifier}`.
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
          {/* V6 2.3.2: actually render the thumbnail. The IA
              services/img redirect is wired into the field list, so
              `item.imageUrl` is now a real IA CDN URL. The placeholder
              underneath stays as a fallback while the image is in
              flight and as a graceful failure if the image 404s. */}
          {showImage && (
            <Image
              source={{uri: item.imageUrl}}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
              accessibilityIgnoresInvertColors
            />
          )}
          {!showImage && (
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
});

// ─── Screen ─────────────────────────────────────────────────────────────

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  navigation,
  route,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
  } = useMoviesScreen(route.params?.categoryId);

  // V6 2.3.2: inline error state for "this movie can't be played" —
  // shown next to the grid instead of navigating into the player with
  // an empty fileUri (which previously surfaced as "No Video File").
  const [movieError, setMovieError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleCategoryPress = useCallback(
    (id: string) => {
      setSelectedCategory(id);
    },
    [setSelectedCategory],
  );

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // V6 2.3.2: validate the URL *before* navigating into the player.
      // The previous flow always navigated and surfaced "No Video File"
      // inside the player when the IA CDN hadn't replicated the file
      // list yet. We now (1) retry the metadata API up to 3 times with
      // a toast on each switch, (2) refuse to navigate if the URL is
      // still bad — instead show an inline error in the Movies screen.
      setMovieError(null);
      setResolvingId(item.identifier);
      try {
        const details = await resolveInternetArchiveVideoDetails(
          item.identifier,
          (attempt, max) => {
            // Tell the user why the second-tap is slow: the CDN just
            // handed back a partial response, so we're trying a
            // different server. Toast, not inline, so it doesn't push
            // the grid around.
            toast.show(
              `Trying alternate server… (attempt ${attempt}/${max})`,
              'info',
              1800,
            );
          },
        );
        if (!details) {
          // Three attempts and still no playable file. We treat this
          // as a "this item really isn't playable" condition rather
          // than a transient network failure — three IA attempts in
          // <2s is enough that the item is the problem, not the net.
          setMovieError({
            title: 'No Video File',
            message:
              'This item does not have a playable video file. Please try a different movie.',
          });
          return;
        }
        // Double-check: even after retries, refuse to navigate if the
        // returned URL is still a directory. This is the original
        // "No Video File" symptom and we don't want to drag the user
        // into the player just to show them the same error there.
        if (details.streamingUrl.endsWith('/')) {
          setMovieError({
            title: 'No Video File',
            message:
              'This item does not have a playable video file. Please try a different movie.',
          });
          return;
        }
        navigation.navigate('VideoPlayer', {
          fileUri: details.streamingUrl,
          fileTitle: item.title,
          startPosition: 0,
        });
      } catch (err) {
        setMovieError({
          title: 'Unable to Load',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to fetch the video file. Please try again.',
        });
      } finally {
        setResolvingId(null);
      }
    },
    [navigation, toast],
  );

  // Render the grid
  const currentResults = selectedCategory ? results[selectedCategory] ?? [] : [];
  const isEmpty = currentResults.length === 0 && !isLoading && !error;

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Movies" />

      {/* ── Category Chips ── */}
      <View style={[styles.chipSection, {borderBottomColor: colors.background.highlightDim}]}>
        <FlatList
          horizontal
          data={MOVIE_CATEGORIES}
          keyExtractor={cat => String(cat.id)}
          renderItem={({item: cat}) => (
            <CategoryChip
              category={cat}
              isSelected={selectedCategory === cat.id}
              onPress={handleCategoryPress}
            />
          )}
          contentContainerStyle={styles.chipScroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={MOVIE_CATEGORIES.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
        {/* Description */}
        {selectedCategory && (
          <AppText variant="caption" color="tertiary" style={styles.categoryDesc}>
            {MOVIE_CATEGORIES.find(c => c.id === selectedCategory)?.description ?? ''}
          </AppText>
        )}
      </View>

      {/* ── Content Area ── */}
      <View style={styles.contentArea}>
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityOrb />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              Loading movies...
            </AppText>
          </View>
        )}

        {error && (
          <View style={styles.centerState}>
            <SvgIcon name="alertCircle" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              Couldn't load movies. Pull down to retry.
            </AppText>
          </View>
        )}

        {isEmpty && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon name="folder" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              No movies found in this category.
            </AppText>
          </View>
        )}

        {/* V6 2.3.2: per-movie inline error state. Shown when a tap
            on a movie fails to resolve to a playable file — instead of
            pushing the player with an empty fileUri, we keep the user
            on this screen and explain why. */}
        {movieError && (
          <View style={styles.movieErrorBanner}>
            <SvgIcon name="alertCircle" size={22} color={colors.accent.gold} />
            <View style={styles.movieErrorText}>
              <AppText variant="body2" weight="bold" color="primary">
                {movieError.title}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {movieError.message}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setMovieError(null)}
              accessibilityLabel="Dismiss movie error"
              accessibilityRole="button"
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <SvgIcon name="close" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && currentResults.length > 0 && (
          <FlatList
            data={currentResults}
            renderItem={({item}) => (
              <MovieCard
                item={item}
                onPress={handleMoviePress}
                isResolving={resolvingId === item.identifier}
              />
            )}
            keyExtractor={item => item.identifier}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        )}
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  chipSection: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryDesc: {
    paddingHorizontal: spacing.lg,
    opacity: 0.7,
  },
  contentArea: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  // V6 2.3.2: inline error banner styles. Sits at the top of the
  // content area as a dismissible pill — distinguishes per-movie
  // resolution failures from the global "couldn't load movies" state.
  movieErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#2A1F0A', // dim gold-tinted surface
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#5C4A1F',
  },
  movieErrorText: {
    flex: 1,
    gap: 2,
  },
  gridContent: {
    padding: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
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
  // V6 2.3.2: actual image style. Fills the wrapper, sits behind
  // the duration/rating badges (z-order from JSON position), and
  // respects the wrapper's 16:9 aspect ratio.
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
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
