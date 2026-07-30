// ─── Music Browser Screen ──────────────────────────────────────────────
// Browse free music from Jamendo and Audius APIs with genre category chips.

import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useMusicScreen,
  type MusicTrackDisplayItem,
} from './hooks/useMusicScreen';
import {MUSIC_CATEGORIES} from '../../constants/musicCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtDur(s: number): string {
  if (!s || s <= 0) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Genre Chip ─────────────────────────────────────────────────────────

interface GenreChipProps {
  category: (typeof MUSIC_CATEGORIES)[number];
  isSelected: boolean;
  onPress: (genre: string) => void;
}

const GenreChip: React.FC<GenreChipProps> = React.memo(
  ({category, isSelected, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(category.genre)}
        style={[
          styles.chip,
          {
            backgroundColor: isSelected
              ? colors.accent.gold
              : colors.background.elevated,
            borderColor: isSelected
              ? colors.accent.gold
              : colors.border.subtle,
          },
        ]}>
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

// ─── Track Card ─────────────────────────────────────────────────────────

interface TrackCardProps {
  item: MusicTrackDisplayItem;
  onPress: (item: MusicTrackDisplayItem) => void;
}

const TrackCard: React.FC<TrackCardProps> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const hasImage = item.imageUrl.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={[
        styles.trackCard,
        {backgroundColor: colors.background.elevated},
      ]}>
      {/* Square image area */}
      <View
        style={[
          styles.imageWrap,
          {backgroundColor: colors.background.primary},
        ]}>
        {hasImage ? (
          <Image
            source={{uri: item.imageUrl}}
            style={styles.artworkImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <SvgIcon name="music" size={28} color={colors.accent.goldDim} />
          </View>
        )}
        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <AppText variant="caption" style={styles.durationText}>
            {fmtDur(item.duration)}
          </AppText>
        </View>
      </View>

      {/* Info */}
      <View style={styles.trackInfo}>
        <AppText
          variant="bodySmall"
          numberOfLines={1}
          style={styles.trackTitle}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="secondary" numberOfLines={1}>
          {item.artistName}
        </AppText>
      </View>
    </TouchableOpacity>
  );
});

// ─── Screen ─────────────────────────────────────────────────────────────

export const MusicScreen: React.FC<
  RootStackScreenProps<'MusicScreen'>
> = ({navigation, route}) => {
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
  } = useMusicScreen(route.params?.genre);

  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const handleCategoryPress = useCallback(
    (genre: string) => {
      setSelectedCategory(genre);
      // Clear search when selecting a category
      if (searchQuery.trim()) {
        setSearchQuery('');
      }
    },
    [setSelectedCategory, searchQuery, setSearchQuery],
  );

  const handleTrackPress = useCallback(
    (item: MusicTrackDisplayItem) => {
      navigation.navigate('MusicDetail', {
        trackId: String(item.id),
        source: item.source,
      });
    },
    [navigation],
  );

  const isEmpty = results.length === 0 && !isLoading && !error;

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Music" />

      {/* ── Search Bar ── */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.background.elevated,
              borderColor: isFocused
                ? colors.accent.gold
                : colors.border.subtle,
            },
          ]}>
          <SvgIcon
            name="search"
            size={18}
            color={isFocused ? colors.accent.gold : colors.text.tertiary}
          />
          <TextInput
            ref={searchRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tracks..."
            placeholderTextColor={colors.text.tertiary}
            style={[styles.searchInput, {color: colors.text.primary}]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                searchRef.current?.blur();
              }}
              style={styles.clearButton}>
              <SvgIcon name="close" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Genre Chips ── */}
      <View
        style={[
          styles.chipSection,
          {borderBottomColor: colors.border.subtle},
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}>
          {MUSIC_CATEGORIES.map(cat => (
            <GenreChip
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.genre}
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
              Loading tracks...
            </AppText>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon name="alertCircle" size={40} color={colors.semantic.error} />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              {error}
            </AppText>
          </View>
        )}

        {isEmpty && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon name="music" size={40} color={colors.accent.goldDim} />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              No tracks found
            </AppText>
          </View>
        )}

        {!isLoading && !error && results.length > 0 && (
          <FlatList
            data={results}
            renderItem={({item}) => (
              <TrackCard item={item} onPress={handleTrackPress} />
            )}
            keyExtractor={item => `${item.source}-${item.id}`}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  chipSection: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
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
  gridContent: {
    padding: spacing.sm,
  },
  gridRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  trackCard: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  artworkImage: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  durationText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  trackInfo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  trackTitle: {
    fontWeight: '700',
    lineHeight: 16,
  },
});
