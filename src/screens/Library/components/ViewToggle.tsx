import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius} from '../../../theme/tokens';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Inline 2×2 grid icon drawn with RN Views (no SVG dependency needed) */
const GridIcon: React.FC<{color: string}> = ({color}) => (
  <View style={styles.gridOuter}>
    <View style={styles.gridRow}>
      <View style={[styles.gridCell, {backgroundColor: color}]} />
      <View style={[styles.gridCell, {backgroundColor: color}]} />
    </View>
    <View style={styles.gridRow}>
      <View style={[styles.gridCell, {backgroundColor: color}]} />
      <View style={[styles.gridCell, {backgroundColor: color}]} />
    </View>
  </View>
);

/** Inline list icon drawn with RN Views */
const ListIcon: React.FC<{color: string}> = ({color}) => (
  <View style={styles.listOuter}>
    {[0, 1, 2].map(i => (
      <View key={i} style={[styles.listBar, {backgroundColor: color}]} />
    ))}
  </View>
);

export const ViewToggle: React.FC<ViewToggleProps> = ({value, onChange}) => {
  const {colors} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
      <TouchableOpacity
        style={[styles.btn, value === 'grid' && {backgroundColor: colors.accent.goldDim}]}
        onPress={() => onChange('grid')}
        activeOpacity={0.7}
        accessibilityLabel="Grid view">
        <GridIcon color={value === 'grid' ? colors.accent.gold : colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, value === 'list' && {backgroundColor: colors.accent.goldDim}]}
        onPress={() => onChange('list')}
        activeOpacity={0.7}
        accessibilityLabel="List view">
        <ListIcon color={value === 'list' ? colors.accent.gold : colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const GRID_CELL = 5;
const GRID_GAP = 2;
const GRID_SIZE = GRID_CELL * 2 + GRID_GAP;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm - 1,
  },
  // Grid icon
  gridOuter: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    justifyContent: 'space-between',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCell: {
    width: GRID_CELL,
    height: GRID_CELL,
    borderRadius: 1,
  },
  // List icon
  listOuter: {
    width: 14,
    height: 14,
    justifyContent: 'space-between',
  },
  listBar: {
    height: 3,
    borderRadius: 1.5,
  },
});
