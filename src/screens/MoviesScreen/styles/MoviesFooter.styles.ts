// ─── Movies — in-flow footer styles ──────────────────────────────────
// Rendered by components/MoviesFooter inside the FlatList.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createMoviesFooterStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    footerWrap: {
      // `minHeight` pins the slot's geometry across all branches
      // (spacer / loading / caught-up), so switching state never reflows
      // the FlatList's bottom edge.
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerSpacer: {
      // Height identical to `footerRow`'s visual footprint so the bottom
      // edge doesn't jump as the footer state toggles.
      height: 28,
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
