// ─── Shows — ShowRow styles ─────────────────────────────────────────────
// The catalogue row: a poster, the show's name, its meta line and the
// chevron that says "this opens a page".
//
// The row OPENS the show's page, so there is no play button inside it
// and no long-press menu — a SHOW is a series, not a playable file, and
// the actions that can act live on the show's own page.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createShowRowStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    showRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      gap: spacing.md,
      backgroundColor: colors.background.elevated,
    },
    posterWrap: {
      width: 44,
      height: 64,
      borderRadius: radius.sm,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    poster: {
      width: 44,
      height: 64,
    },
    posterPlaceholder: {
      // The artwork's plate — a gold-dim plate with the glyph on it, so a
      // show with no poster is a plate and not a hole in the list.
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      // The weight lives in the FAMILY key, not in a `fontWeight` prop:
      // `fontWeight: '600'` on the family `Inter` asks Android for
      // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops
      // the suffix below weight 700), so the SemiBold face was
      // unreachable and the title was drawn in Inter REGULAR.
      fontFamily: FONT_FAMILY.inter.semibold,
    },
  });
