// ─── Podcast Categories Shelf ────────────────────────────────────────────
// Horizontal scroll of pre-built podcast category cards for the HomeScreen.
// Non-tech-savvy UX: tap a category → opens PodcastsScreen with results.

import React from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface PodcastCategoriesShelfProps {
  onCategoryPress: (categoryId: number) => void;
  onSeeAll: () => void;
}

export const PodcastCategoriesShelf: React.FC<PodcastCategoriesShelfProps> = React.memo(
  ({onCategoryPress, onSeeAll}) => {
    const {colors} = useTheme();

    const categories = PODCAST_CATEGORIES.slice(0, 6);

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Podcasts"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        {/* 59.1: virtualized category rail */}
        <FlatList
          horizontal
          data={categories}
          keyExtractor={cat => String(cat.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onCategoryPress(cat.id)}
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
                  name={cat.icon as any}
                  size={22}
                  color={colors.accent.gold}
                />
              </View>
              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
                numberOfLines={1}>
                {cat.name}
              </AppText>
            </TouchableOpacity>
          )}
          initialNumToRender={Math.min(categories.length, 24)}
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
    width: 110,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
