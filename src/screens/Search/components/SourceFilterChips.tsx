// ─── Source Filter Chips ────────────────────────────────────────────────
// P40.2: narrow unified search results by source — one chip per aggregator
// source (All/Local/Music/Podcasts/Radio/TV/Audiobooks/Archive).

import React from 'react';
import {FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

export type SearchSource =
  | 'all'
  | 'local'
  | 'music'
  | 'podcasts'
  | 'radio'
  | 'tv'
  | 'audiobooks'
  | 'archive';

const SOURCES: {id: SearchSource; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'local', label: 'Local'},
  {id: 'music', label: 'Music'},
  {id: 'podcasts', label: 'Podcasts'},
  {id: 'radio', label: 'Radio'},
  {id: 'tv', label: 'TV'},
  {id: 'audiobooks', label: 'Audiobooks'},
  {id: 'archive', label: 'Archive'},
];

interface SourceFilterChipsProps {
  active: SearchSource;
  onChange: (source: SearchSource) => void;
}

export const SourceFilterChips: React.FC<SourceFilterChipsProps> = React.memo(
  ({active, onChange}) => {
    const {colors} = useTheme();
    return (
      <FlatList
        horizontal
        data={SOURCES}
        keyExtractor={src => src.id}
        renderItem={({item: src}) => {
          const isActive = src.id === active;
          return (
            <TouchableOpacity
              onPress={() => onChange(src.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              style={[
                styles.chip,
                isActive
                  ? {backgroundColor: colors.accent.gold}
                  : {backgroundColor: colors.background.elevated},
              ]}>
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  {
                    color: isActive
                      ? colors.background.primary
                      : colors.text.secondary,
                  },
                ]}>
                {src.label}
              </AppText>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.row}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={SOURCES.length}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    );
  },
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: {
    fontWeight: '600',
  },
});
