import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {SkeletonLoader} from '../../../components/core/Skeleton/SkeletonLoader';
import {spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

interface HomeLoadingSkeletonProps {
  colors: ColorTokens;
}

export const HomeLoadingSkeleton: React.FC<HomeLoadingSkeletonProps> = () => {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Hero skeleton */}
      <View style={styles.heroSection}>
        <SkeletonLoader width="100%" height={200} borderRadius={16} />
      </View>

      {/* Shelf 1: ContinueWatching */}
      <View style={styles.shelf}>
        <SkeletonLoader width="40%" height={20} borderRadius={6} style={styles.header} />
        <SkeletonLoader width="100%" height={120} borderRadius={12} />
      </View>

      {/* Shelf 2: Frequently Played */}
      <View style={styles.shelf}>
        <SkeletonLoader width="40%" height={20} borderRadius={6} style={styles.header} />
        <View style={styles.row}>
          {[1, 2, 3].map(i => (
            <SkeletonLoader key={i} width={110} height={160} borderRadius={12} />
          ))}
        </View>
      </View>

      {/* Shelf 3: Recently Added */}
      <View style={styles.shelf}>
        <SkeletonLoader width="40%" height={20} borderRadius={6} style={styles.header} />
        <View style={styles.row}>
          {[1, 2, 3].map(i => (
            <SkeletonLoader key={i} width={110} height={160} borderRadius={12} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  heroSection: {
    marginBottom: 20,
  },
  shelf: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
