// ─── Music Categories Shelf ─────────────────────────────────────────────
// Horizontal scroll of pre-built music genre cards for the HomeScreen.
// Non-tech-savvy UX: tap a genre → opens MusicScreen with results.

import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface MusicCategoriesShelfProps {
  onCategoryPress: (genre: string) => void;
  onSeeAll: () => void;
}

export const MusicCategoriesShelf: React.FC<MusicCategoriesShelfProps> = React.memo(
  ({onCategoryPress, onSeeAll}) => {
    const {colors} = useTheme();

    const categories = MUSIC_CATEGORIES.slice(0, 6);

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Music"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => onCategoryPress(cat.genre)}
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
          ))}
        </ScrollView>
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
