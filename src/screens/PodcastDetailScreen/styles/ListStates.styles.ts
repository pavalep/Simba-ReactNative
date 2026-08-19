// ─── Podcast Detail — List states styles ───────────────────────────────
// Loading / error / empty placeholders rendered by components/ListStates.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createListStatesStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    episodesEmpty: {
      paddingTop: spacing.lg,
    },
    retryButton: {
      backgroundColor: colors.accent.goldDim,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    retryText: {
      color: colors.accent.gold,
    },
  });
