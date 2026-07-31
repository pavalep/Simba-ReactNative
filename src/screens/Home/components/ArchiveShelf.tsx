// ─── Internet Archive Shelf ────────────────────────────────
// Phase 37.7: browse entries for the Internet Archive on Home.
// Tapping an entry opens ArchiveScreen on the matching tab.

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {
  ARCHIVE_BROWSE,
  ARCHIVE_QUICK_SEARCHES,
  type ArchiveBrowseEntry,
} from '../../../constants/audiobookCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface ArchiveShelfProps {
  onBrowsePress: (entry: ArchiveBrowseEntry) => void;
  onQuickSearch: (query: string) => void;
  onSeeAll: () => void;
}

// 59.1: both rail segments (browse entries + first 3 quick searches) as one virtualized list
type ShelfItem =
  | {key: string; kind: 'browse'; entry: ArchiveBrowseEntry}
  | {key: string; kind: 'search'; q: (typeof ARCHIVE_QUICK_SEARCHES)[number]};

const SHELF_ITEMS: ShelfItem[] = [
  ...ARCHIVE_BROWSE.map(entry => ({
    key: `b-${entry.id}`,
    kind: 'browse' as const,
    entry,
  })),
  ...ARCHIVE_QUICK_SEARCHES.slice(0, 3).map(q => ({
    key: `q-${q.id}`,
    kind: 'search' as const,
    q,
  })),
];

export const ArchiveShelf: React.FC<ArchiveShelfProps> = React.memo(
  ({onBrowsePress, onQuickSearch, onSeeAll}) => {
    const {colors} = useTheme();

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Internet Archive"
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
                onPress={() => onQuickSearch(item.q.query)}
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
                    name={item.q.icon as never}
                    size={22}
                    color={colors.accent.gold}
                  />
                </View>
                <AppText
                  variant="bodySmall"
                  style={styles.cardTitle}
                  numberOfLines={1}>
                  {item.q.label}
                </AppText>
                <AppText
                  variant="caption"
                  color="tertiary"
                  numberOfLines={2}
                  style={styles.cardDesc}>
                  Search “{item.q.query}”
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
