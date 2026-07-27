// ────────────────────────────────────────────────────────
// Simba Player — Skeleton Card Component
// ────────────────────────────────────────────────────────
// Phase 15: Placeholder card with image + text skeleton lines.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {SkeletonLoader} from './SkeletonLoader';

interface SkeletonCardProps {
  /** If true, shows a large poster/art placeholder */
  hasImage?: boolean;
  /** Number of text lines to show (default 2) */
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  lines = 2,
}) => {
  const {radius: r} = useTheme();
  const lineHeights = [18, 14];

  return (
    <View
      accessible={true}
      accessibilityLabel="Loading content card"
      accessibilityRole="progressbar"
      style={[styles.card, {borderRadius: r.md}]}>
      {hasImage && (
        <SkeletonLoader
          width="100%"
          height={140}
          borderRadius={r.sm}
          style={styles.image}
        />
      )}
      <View style={styles.textBlock}>
        {Array.from({length: lines}).map((_, i) => (
          <SkeletonLoader
            key={i}
            width={i === 0 ? '75%' : '55%'}
            height={lineHeights[i] ?? 14}
            borderRadius={4}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginBottom: 0,
  },
  image: {
    marginBottom: 10,
  },
  textBlock: {
    gap: 8,
  },
  line: {
    marginBottom: 0,
  },
});
