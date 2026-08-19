// ─── Podcasts — PodcastRow styles ──────────────────────────────────────
// Single-column list row (the brand — no view group on this section):
//
//   [60×60 thumb]  Title (1 line)
//                  Author (secondary)
//                  [N ep.]          ›

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createPodcastRowStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      gap: spacing.md,
      backgroundColor: colors.background.elevated,
    },
    thumbWrap: {
      width: 60,
      height: 60,
      borderRadius: radius.sm,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    thumbImage: {
      width: 60,
      height: 60,
    },
    thumbPlaceholder: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.4,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      fontWeight: '600',
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm - 2,
      backgroundColor: colors.accent.goldDim,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent.gold,
    },
  });
