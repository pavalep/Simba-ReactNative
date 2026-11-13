// ─── Music — in-flow footer styles ───────────────────────────────────
// Rendered by components/MusicFooter inside the FlatList.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';
import {BROWSE_FOOTER_MARGIN_BOTTOM} from '../../_shared/browseFooter';

export const createMusicFooterStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    footerWrap: {
      // `minHeight` pins the slot's geometry across all branches
      // (nothing / loading / retry), so switching state never reflows the
      // FlatList's bottom edge. The Movies and Podcasts footers already
      // worked this way; this copy did not, and its slot was 2 dp shorter
      // than theirs.
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      // The footer gives the list's FAB clearance back, so the loader row
      // lands on the button's own line instead of floating 68 dp above the
      // bottom edge. See `_shared/browseFooter.ts`.
      marginBottom: BROWSE_FOOTER_MARGIN_BOTTOM,
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
