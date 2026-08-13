import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface GenreChip {
  name: string;
  count: number;
}

interface GenreChipsShelfProps {
  genres: GenreChip[];
  onGenrePress: (genre: string) => void;
}

export const GenreChipsShelf: React.FC<GenreChipsShelfProps> = ({
  genres,
  onGenrePress,
}) => {
  const {colors} = useTheme();

  if (genres.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="displaySans" color="primary" style={styles.headerTitle}>
          Browse by Genre
        </AppText>
      </View>

      <FlatList
        horizontal
        data={genres}
        keyExtractor={genre => genre.name}
        renderItem={({item: genre}) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onGenrePress(genre.name)}
            accessibilityRole="button"
            style={[styles.chip, {borderColor: colors.border.subtle}]}>
            <LinearGradient
              colors={[colors.accent.goldDim, colors.accent.gold + '30']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.chipContent}>
              <View style={[styles.iconCircle, {backgroundColor: colors.background.scrimSoft}]}>
                <SvgIcon name="music" size={16} color={colors.accent.gold} />
              </View>
              <AppText variant="body2" style={[styles.chipText, {color: colors.text.bright}]}>
                {genre.name}
              </AppText>
              <View style={[styles.countBadge, {backgroundColor: colors.background.highlightStrong}]}>
                <AppText variant="caption" style={[styles.countText, {color: colors.text.onMediaSoft}]}>
                  {genre.count}
                </AppText>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={Math.min(genres.length, 24)}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: 4,
  },
  chip: {
    height: 44,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs,
    height: '100%',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
