// ─── Live TV Categories Shelf ───────────────────────────────
// Phase 36.7: browse entries for Live TV on the Home screen.
// Category ids are real iptv-org ids — channels are fetched
// live from the API (never fake data).

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {IPTV_CATEGORIES} from '../../../constants/liveCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface LiveTVCategoriesShelfProps {
  onCategoryPress: (categoryId: string) => void;
  onSeeAll: () => void;
}

export const LiveTVCategoriesShelf: React.FC<LiveTVCategoriesShelfProps> = React.memo(
  ({onCategoryPress, onSeeAll}) => {
    const {colors} = useTheme();

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Live TV"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        <FlatList
          horizontal
          data={IPTV_CATEGORIES}
          keyExtractor={cat => cat.id}
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
          contentContainerStyle={styles.scroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={IPTV_CATEGORIES.length}
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
    width: 120,
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
});
