// ─── Music — List states styles ─────────────────────────────────────
// Mirrors MoviesScreen / PodcastsScreen pattern. The centered loading
// pill anchors at ~20% from the top so it reads as a status pill,
// not a splash placeholder. Error / empty states use the shared
// ErrorState / EmptyState components which style themselves.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';

export const createListStatesStyles = () =>
  StyleSheet.create({
    centerLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '20%',
    },
    centerLoaderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    centerLoaderText: {
      opacity: 0.85,
    },
  });
