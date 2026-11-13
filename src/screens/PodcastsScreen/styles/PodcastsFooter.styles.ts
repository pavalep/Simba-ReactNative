// ─── Podcasts — in-flow footer styles ─────────────────────────────────
// Rendered by components/PodcastsFooter inside the FlatList.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';
import {BROWSE_FOOTER_MARGIN_BOTTOM} from '../../_shared/browseFooter';

export const createPodcastsFooterStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    footerWrap: {
      // `minHeight` pins the slot's geometry across all branches
      // (spacer / loading / caught-up), so switching state never reflows
      // the FlatList's bottom edge.
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      // The footer gives the list's FAB clearance back, so the loader row
      // lands on the button's own line instead of floating 68 dp above the
      // bottom edge. See `_shared/browseFooter.ts`.
      marginBottom: BROWSE_FOOTER_MARGIN_BOTTOM,
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
