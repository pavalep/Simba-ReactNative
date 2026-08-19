// ─── Podcast Detail — screen-level styles ──────────────────────────────
// Only styles owned directly by PodcastDetailScreen (FlatList chrome).
// Per-component styles live in their own files (HeroSection.styles,
// DetailItem.styles, ListStates.styles) — see the styles barrel.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createPodcastScreenStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    listFooter: {
      // Reserve a fixed slot so the FlatList's bottom edge doesn't
      // jump between states (loading → retry → caught-up → spacer).
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    footerText: {
      opacity: 0.85,
    },
    loadMoreRetry: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderColor: colors.background.highlight,
    },
  });