// ─── Movie Browser Screen ──────────────────────────────────────────────
// Non-tech-savvy UX: pre-built categories, no search bar.
// Tap a category → see results grid → tap a movie → play.

import React, {useCallback} from 'react';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
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
}

const MovieCard: React.FC<MovieCardProps> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={styles.movieCard}>
      {/* Thumbnail */}
      <View
        style={[
          styles.thumbnailWrap,
          {backgroundColor: colors.background.elevated},
        ]}>
        <View style={styles.thumbnailPlaceholder}>
          <SvgIcon name="video" size={24} color={colors.accent.goldDim} />
        </View>
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
  const {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
  } = useMoviesScreen(route.params?.categoryId);

  const handleCategoryPress = useCallback(
    (id: string) => {
      setSelectedCategory(id);
    },
    [setSelectedCategory],
  );

  const handleMoviePress = useCallback(
    (item: InternetArchiveVideoResult) => {
      navigation.navigate('VideoPlayer', {
        fileUri: item.streamingUrl,
        fileTitle: item.title,
        startPosition: 0,
      });
    },
    [navigation],
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}>
          {MOVIE_CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.id}
              onPress={handleCategoryPress}
            />
          ))}
        </ScrollView>
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

        {!isLoading && !error && currentResults.length > 0 && (
          <FlatList
            data={currentResults}
            renderItem={({item}) => (
              <MovieCard item={item} onPress={handleMoviePress} />
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
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
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
