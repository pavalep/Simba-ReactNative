// ────────────────────────────────────────────────────────
// Simba Player — AlbumMetaBar Component (Phase 17.4)
// Year · N tracks · HH:MM:SS · genre chips
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

interface AlbumMetaBarProps {
  year: number | null;
  trackCount: number;
  totalDuration: string;
  genres: string[];
}

export const AlbumMetaBar: React.FC<AlbumMetaBarProps> = ({
  year,
  trackCount,
  totalDuration,
  genres,
}) => {
  const {colors} = useTheme();

  const metaParts: string[] = [];
  if (trackCount > 0) metaParts.push(`${trackCount} tracks`);
  if (totalDuration !== '0:00') metaParts.push(totalDuration);
  if (year) metaParts.push(String(year));

  return (
    <View style={styles.container}>
      {/* Meta line */}
      <AppText variant="caption" color="tertiary" style={styles.metaLine}>
        {metaParts.join(' · ')}
      </AppText>

      {/* Genre chips */}
      {genres.length > 0 && (
        <View style={styles.genreRow}>
          {genres.map(genre => (
            <View
              key={genre}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.accent.goldDim,
                  borderColor: colors.accent.gold,
                },
              ]}>
              <AppText variant="caption" color="accent">
                {genre}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaLine: {
    textAlign: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs - 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
