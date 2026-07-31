// ─── Podcasts Browse Screen ────────────────────────────────────────────
// Pre-built category chips + search bar for podcast discovery.
// Tap a podcast card → calls onPodcastPress or navigates.

import React, {useCallback, useMemo} from 'react';
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
import {usePodcastsScreen} from './hooks/usePodcastsScreen';
import {PODCAST_CATEGORIES} from '../../constants/podcastCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
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
        style={[
          styles.chip,
          {
            backgroundColor: isSelected
              ? colors.accent.gold
              : colors.background.elevated,
            borderColor: isSelected
              ? colors.accent.gold
              : 'rgba(255,255,255,0.08)',
          },
        ]}>
        <SvgIcon
          name={category.icon as any}
          size={14}
          color={isSelected ? '#000' : colors.text.secondary}
        />
        <AppText
          variant="button"
          style={[
            styles.chipText,
            {color: isSelected ? '#000' : colors.text.secondary},
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
          <SvgIcon name="music" size={24} color={colors.accent.goldDim} />
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
  navigation: _navigation,
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
      }
    },
    [onPodcastPress],
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
          {borderBottomColor: 'rgba(255,255,255,0.05)'},
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}>
          {PODCAST_CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.id}
              onPress={handleCategoryPress}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Content Area ── */}
      <View style={styles.contentArea}>
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityOrb />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              Loading podcasts...
            </AppText>
          </View>
        )}

        {error && (
          <View style={styles.centerState}>
            <SvgIcon
              name="alertCircle"
              size={40}
              color={colors.semantic.error}
            />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              {error}
            </AppText>
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.stateHint}>
              Pull down or tap retry to try again.
            </AppText>
          </View>
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
  stateHint: {
    marginTop: spacing.xs,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContent: {
    padding: spacing.md,
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
