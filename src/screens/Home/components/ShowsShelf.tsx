// ─── TV Shows Shelf ─────────────────────────────────────
// Phase 38.7: browse entries for TV shows (TVMaze) on Home.
// Tapping an entry opens ShowsScreen on the matching mode.

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {
  SHOWS_BROWSE,
  type ShowsBrowseEntry,
} from '../../../constants/showCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

interface ShowsShelfProps {
  onBrowsePress: (entry: ShowsBrowseEntry) => void;
  onSeeAll: () => void;
}

export const ShowsShelf: React.FC<ShowsShelfProps> = React.memo(
  ({onBrowsePress, onSeeAll}) => {
    const {colors} = useTheme();

    return (
      <View style={styles.container}>
        <SectionHeader
          label="TV Shows"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        <FlatList
          horizontal
          data={SHOWS_BROWSE}
          keyExtractor={entry => entry.id}
          renderItem={({item: entry}) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onBrowsePress(entry)}
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
                  name={entry.icon as never}
                  size={22}
                  color={colors.accent.gold}
                />
              </View>
              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
                numberOfLines={1}>
                {entry.name}
              </AppText>
              <AppText
                variant="caption"
                color="tertiary"
                numberOfLines={2}
                style={styles.cardDesc}>
                {entry.description}
              </AppText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.scroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={SHOWS_BROWSE.length}
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
