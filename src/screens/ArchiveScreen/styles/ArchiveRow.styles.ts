// ─── Archive — row styles ──────────────────────────────────────────────
// The list row: a cover plate, the collection's title and its meta, and
// a chevron. The row is the collection's OWN card — it opens the
// collection's page, so it carries no play affordance and no menu.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createArchiveRowStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      padding: spacing.sm,
      // The gap between rows belongs to the ROW, not to a separator
      // component — the same shape as the Music and Audiobooks rows.
      marginBottom: spacing.sm,
      gap: spacing.md,
      backgroundColor: colors.background.elevated,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: colors.border.subtle,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      // 600 lives in the family key ('Inter SemiBold'), not in a
      // `fontWeight` prop.
      fontFamily: FONT_FAMILY.inter.semibold,
    },
  });
