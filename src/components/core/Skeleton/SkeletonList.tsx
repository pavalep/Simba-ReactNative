// ────────────────────────────────────────────────────────
// Simba Player — Skeleton List Component
// ────────────────────────────────────────────────────────
// Phase 15: Renders a vertical list of skeleton cards.
// v10.3b: Adds `view='grid'` — renders 2-col 16:9 shimmer rectangles
// that match the hero-grid layout (e.g. Movies). Loading state now
// mirrors the post-load UI shape so the user perceives a smooth
// transition into content, not a "skeleton was wrong" jump.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SkeletonCard} from './SkeletonCard';
import {SkeletonLoader} from './SkeletonLoader';

interface SkeletonListProps {
  count?: number;
  hasImage?: boolean;
  lines?: number;
  /** 'list' (default) — vertical list of SkeletonCard rows (text-heavy
   *  layouts like Music / Podcast). 'grid' — 2 columns × N rows of 16:9
   *  shimmer rectangles that mirror the hero grid (Movies). */
  view?: 'grid' | 'list';
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 4,
  hasImage = true,
  lines = 2,
  view = 'list',
}) => {
  if (view === 'grid') {
    // 2 columns of 16:9 shimmer rectangles. `count` here is the total
    // number of cells; even counts read as a clean grid, odd counts
    // leave one cell trailing (intentional, matches the real layout).
    return (
      <View
        accessible={true}
        accessibilityLabel="Loading content grid"
        accessibilityRole="progressbar"
        style={styles.gridList}>
        {Array.from({length: count}).map((_, i) => (
          <View key={i} style={styles.gridItem}>
            <SkeletonLoader
              borderRadius={0}
              style={styles.gridSkeleton}
            />
          </View>
        ))}
      </View>
    );
  }
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
  // Grid layout — 2 columns of 16:9 shimmer blocks, full-bleed
  // (no outer padding so the skeleton matches Movies' zero-padded grid).
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    aspectRatio: 16 / 9,
  },
  gridSkeleton: {
    width: '100%',
    height: '100%',
  },
});
