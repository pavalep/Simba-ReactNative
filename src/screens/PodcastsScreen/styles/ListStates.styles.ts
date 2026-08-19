// ─── Podcasts — List states styles ────────────────────────────────────
// Loading / error / empty placeholders rendered by components/ListStates
// (PodcastDetailScreen parity — same retry pill language).

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createListStatesStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    retryButton: {
      marginTop: spacing.md,
      backgroundColor: colors.accent.goldDim,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    retryText: {
      color: colors.accent.gold,
    },
  });
