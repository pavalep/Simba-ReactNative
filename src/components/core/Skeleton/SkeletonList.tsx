// ────────────────────────────────────────────────────────
// Simba Player — Skeleton List Component
// ────────────────────────────────────────────────────────
// Phase 15: Renders a vertical list of skeleton cards.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SkeletonCard} from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  hasImage?: boolean;
  lines?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 4,
  hasImage = true,
  lines = 2,
}) => {
  return (
    <View
      accessible={true}
      accessibilityLabel="Loading content list"
      accessibilityRole="progressbar"
      style={styles.list}>
      {Array.from({length: count}).map((_, i) => (
        <View key={i} style={styles.item}>
          <SkeletonCard hasImage={hasImage} lines={lines} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 20,
  },
  item: {
    width: '100%',
  },
});
