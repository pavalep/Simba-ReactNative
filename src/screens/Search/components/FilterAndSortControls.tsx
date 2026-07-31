import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {radius} from '../../../theme/tokens';

type FilterMode = 'all' | 'videos' | 'audio';
type SortMode = 'relevance' | 'date' | 'name';

interface FilterAndSortControlsProps {
  activeFilter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  activeSort: SortMode;
  onSortChange: (sort: SortMode) => void;
}

const FILTERS: {key: FilterMode; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'videos', label: 'Videos'},
  {key: 'audio', label: 'Audio'},
];

const SORTS: {key: SortMode; label: string}[] = [
  {key: 'relevance', label: 'Relevance'},
  {key: 'date', label: 'Date'},
  {key: 'name', label: 'Name'},
];

export const FilterAndSortControls: React.FC<FilterAndSortControlsProps> = ({
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
}) => {
  const {colors, spacing: s} = useTheme();

  return (
    <View style={{marginTop: s.sm}}>
      <View style={styles.filterRow}>
        <View style={styles.chipsContainer}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.7}
                onPress={() => onFilterChange(f.key)}
                style={[
                  styles.chip,
                  styles.chipActive,
                  {
                    backgroundColor: isActive
                      ? colors.accent.gold
                      : colors.border.subtle,
                    borderColor: isActive
                      ? colors.accent.gold
                      : colors.border.emphasis,
                  },
                ]}>
                <AppText
                  variant="caption"
                  color={isActive ? 'primary' : 'secondary'}
                  style={{fontWeight: isActive ? '600' : '400'}}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sortRow}>
        <AppText
          variant="caption"
          color="tertiary"
          style={styles.sortLabel}>
          Sort:
        </AppText>
        {SORTS.map(sort => {
          const isActive = activeSort === sort.key;
          return (
            <TouchableOpacity
              key={sort.key}
              onPress={() => onSortChange(sort.key)}
              style={[
                styles.sortOption,
                isActive && {
                  backgroundColor: colors.accent.goldDim,
                },
              ]}>
              <AppText
                variant="caption"
                color={isActive ? 'accent' : 'secondary'}
                style={{fontWeight: isActive ? '600' : '400'}}>
                {sort.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
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
  chipActive: {
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    opacity: 0.5,
  },
  sortOption: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
