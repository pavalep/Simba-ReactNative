// ─── Podcasts Browse Screen ────────────────────────────────────────────
// Pre-built category chips + search bar for podcast discovery.
// Tap a podcast card → calls onPodcastPress or navigates.

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {usePodcastsScreen} from './hooks/usePodcastsScreen';
import {PODCAST_CATEGORIES} from '../../constants/podcastCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {SkeletonList} from '../../components/core/Skeleton/SkeletonList';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import FastImage from 'react-native-fast-image';
import type {PodcastResult} from '../../types/api';

// ─── Props ─────────────────────────────────────────────────────────────

interface PodcastsScreenProps extends RootStackScreenProps<'PodcastsScreen'> {
  onPodcastPress?: (item: PodcastResult) => void;
}

// ─── Category Chip ─────────────────────────────────────────────────────

interface CategoryChipProps {
  category: (typeof PODCAST_CATEGORIES)[number];
  isSelected: boolean;
  onPress: (id: number) => void;
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

// ─── Podcast Card ──────────────────────────────────────────────────────

interface PodcastCardProps {
  item: PodcastResult;
  onPress: (item: PodcastResult) => void;
}

const PodcastCard: React.FC<PodcastCardProps> = React.memo(
  ({item, onPress}) => {
    const {colors} = useTheme();

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        style={[
          styles.podcastCard,
          {backgroundColor: colors.background.elevated},
        ]}>
        {/* Image / Placeholder */}
        <View
          style={[
            styles.podcastImage,
            {backgroundColor: colors.border.subtle},
          ]}>
          {item.image ? (
            <FastImage
              source={{uri: item.image}}
              style={styles.podcastImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon name="music" size={24} color={colors.accent.goldDim} />
          )}
        </View>

        {/* Info column */}
        <View style={styles.podcastInfo}>
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            style={styles.podcastTitle}>
            {item.title}
          </AppText>
          {item.author ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {item.author}
            </AppText>
          ) : null}
          {item.episodeCount > 0 && (
            <View
              style={[
                styles.episodeBadge,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText
                variant="caption"
                style={[styles.episodeText, {color: colors.accent.gold}]}>
                {item.episodeCount} ep.
              </AppText>
            </View>
          )}
        </View>

        {/* Arrow */}
        <SvgIcon
          name="chevronRight"
          size={18}
          color={colors.text.tertiary}
        />
      </TouchableOpacity>
    );
  },
);

// ─── Screen ────────────────────────────────────────────────────────────

export const PodcastsScreen: React.FC<PodcastsScreenProps> = ({
  navigation,
  route,
  onPodcastPress,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
    loadMore,
    hasMore,
  } = usePodcastsScreen(route.params?.categoryId);

  const handleCategoryPress = useCallback(
    (id: number) => {
      setSearchQuery('');
      setSelectedCategory(id);
    },
    [setSelectedCategory, setSearchQuery],
  );

  const handlePodcastPress = useCallback(
    (item: PodcastResult) => {
      if (onPodcastPress) {
        onPodcastPress(item);
        return;
      }
      // 35.1: default navigation when not embedded (Home passes its own)
      navigation.navigate('PodcastDetail', {
        podcastId: item.id,
        podcastTitle: item.title,
      });
    },
    [onPodcastPress, navigation],
  );

  // Derive the current results key
  const currentKey = useMemo(() => {
    if (searchQuery.trim()) {
      return `search_${searchQuery.trim().toLowerCase()}`;
    }
    return `cat_${selectedCategory}`;
  }, [searchQuery, selectedCategory]);

  const currentResults = results[currentKey] ?? [];
  const isEmpty = currentResults.length === 0 && !isLoading && !error;

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Podcasts" />

      {/* ── Search Bar (53.3: core SearchBar) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search podcasts…"
        />
      </View>

      {/* ── Category Chips ── */}
      <View
        style={[
          styles.chipSection,
          {borderBottomColor: colors.border.subtle},
        ]}>
        <FlatList
          horizontal
          data={PODCAST_CATEGORIES}
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
          initialNumToRender={PODCAST_CATEGORIES.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      </View>

      {/* ── Content Area ── */}
      <View style={styles.contentArea}>
        {isLoading && currentResults.length === 0 && (
          <SkeletonList count={6} hasImage lines={2} />
        )}

        {error && currentResults.length === 0 && (
          <ErrorState
            title={isOnline ? 'Couldn\'t load podcasts' : 'You\'re offline'}
            message={
              isOnline
                ? error
                : 'Connect to the internet, then retry to browse podcasts.'
            }
            onRetry={retry}
            retryLabel="Retry"
          />
        )}

        {isEmpty && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon
              name="folder"
              size={40}
              color={colors.accent.goldDim}
            />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              No podcasts found.
            </AppText>
          </View>
        )}

        {!isLoading && !error && currentResults.length > 0 && (
          <FlatList
            data={currentResults}
            renderItem={({item}) => (
              <PodcastCard item={item} onPress={handlePodcastPress} />
            )}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={styles.separator} />
            )}
            getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMore && isLoading ? (
                <View style={styles.footerLoading}>
                  <ActivityOrb size={20} />
                  <AppText variant="caption" color="tertiary">
                    Loading more…
                  </AppText>
                </View>
              ) : null
            }
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chipSection: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
  listContent: {
    padding: spacing.md,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  separator: {
    height: spacing.sm,
  },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  podcastImage: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  podcastTitle: {
    fontWeight: '600',
  },
  episodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  episodeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
