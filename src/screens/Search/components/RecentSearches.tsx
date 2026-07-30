import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {radius, spacing} from '../../../theme/tokens';

interface RecentSearchesProps {
  recentSearches: string[];
  onChipTap: (term: string) => void;
  onClearRecent: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  recentSearches,
  onChipTap,
  onClearRecent,
}) => {
  const {colors, spacing: s} = useTheme();

  return (
    <View style={{marginTop: s.sm}}>
      <SectionHeader
        label="Recent Searches"
        actionLabel={recentSearches.length > 0 ? 'Clear' : undefined}
        onAction={recentSearches.length > 0 ? onClearRecent : undefined}
      />
      {recentSearches.length > 0 ? (
        <View style={styles.chipsContainer}>
          {recentSearches.map((term, idx) => (
            <TouchableOpacity
              key={term + idx}
              activeOpacity={0.7}
              onPress={() => onChipTap(term)}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.border.subtle,
                  borderColor: colors.border.emphasis,
                },
              ]}>
              <AppText variant="caption" color="secondary">
                {term}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.hintContainer}>
          <AppText variant="body2" color="tertiary">
            Search tracks, artists, albums, playlists, and linked folders
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 0.5,
  },
  hintContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
