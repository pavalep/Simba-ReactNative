// ─── Audiobooks Shelf ─────────────────────────────────────
// Phase 37.7: browse entries for Audiobooks (LibriVox) on Home.
// Tapping an entry opens AudiobooksScreen on the matching tab.

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {
  AUDIOBOOKS_BROWSE,
  LIBRIVOX_GENRES,
  type AudiobooksBrowseEntry,
} from '../../../constants/audiobookCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface AudiobooksShelfProps {
  onBrowsePress: (entry: AudiobooksBrowseEntry) => void;
  onGenrePress: (genre: string) => void;
  onSeeAll: () => void;
}

// 59.1: both rail segments (browse entries + first 4 genres) as one virtualized list
type ShelfItem =
  | {key: string; kind: 'browse'; entry: AudiobooksBrowseEntry}
  | {key: string; kind: 'genre'; genre: string};

const SHELF_ITEMS: ShelfItem[] = [
  ...AUDIOBOOKS_BROWSE.map(entry => ({
    key: `entry-${entry.id}`,
    kind: 'browse' as const,
    entry,
  })),
  ...LIBRIVOX_GENRES.slice(0, 4).map(genre => ({
    key: `genre-${genre}`,
    kind: 'genre' as const,
    genre,
  })),
];

export const AudiobooksShelf: React.FC<AudiobooksShelfProps> = React.memo(
  ({onBrowsePress, onGenrePress, onSeeAll}) => {
    const {colors} = useTheme();

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Audiobooks"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        <FlatList
          horizontal
          data={SHELF_ITEMS}
          keyExtractor={item => item.key}
          renderItem={({item}) =>
            item.kind === 'browse' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onBrowsePress(item.entry)}
                accessibilityRole="button"
                style={[
                  styles.card,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <View
                  style={[
                    styles.iconCircle,
                    {backgroundColor: colors.accent.goldDim},
                  ]}>
                  <SvgIcon
                    name={item.entry.icon as never}
                    size={22}
                    color={colors.accent.gold}
                  />
                </View>
                <AppText
                  variant="bodySmall"
                  style={styles.cardTitle}
                  numberOfLines={1}>
                  {item.entry.name}
                </AppText>
                <AppText
                  variant="caption"
                  color="tertiary"
                  numberOfLines={2}
                  style={styles.cardDesc}>
                  {item.entry.description}
                </AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onGenrePress(item.genre)}
                accessibilityRole="button"
                style={[
                  styles.card,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <View
                  style={[
                    styles.iconCircle,
                    {backgroundColor: colors.accent.goldDim},
                  ]}>
                  <SvgIcon
                    name="listMusic"
                    size={22}
                    color={colors.accent.gold}
                  />
                </View>
                <AppText
                  variant="bodySmall"
                  style={styles.cardTitle}
                  numberOfLines={1}>
                  {item.genre}
                </AppText>
                <AppText
                  variant="caption"
                  color="tertiary"
                  numberOfLines={2}
                  style={styles.cardDesc}>
                  Browse {item.genre} audiobooks
                </AppText>
              </TouchableOpacity>
            )
          }
          contentContainerStyle={styles.scroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={SHELF_ITEMS.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 140,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    lineHeight: 18,
  },
  cardDesc: {
    lineHeight: 14,
    opacity: 0.7,
  },
});
