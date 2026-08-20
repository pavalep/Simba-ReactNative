// ─── Music — in-flow footer styles ───────────────────────────────────
// Rendered by components/MusicFooter inside the FlatList.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createMusicFooterStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    footerWrap: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    loadMoreRetry: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderColor: colors.background.highlight,
    },
  });
