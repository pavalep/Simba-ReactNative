// ─── Audiobooks — BookCard styles ──────────────────────────────────────
// The catalogue row: a 60×60 cover, the title, the author, the language
// and the running time, and the chevron that says "this opens a page".
//
// The row OPENS THE BOOK'S OWN PAGE, so there is no play button inside
// it — a gold disc in a row that already carries one action read as a
// second button that did nothing.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createBookCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    bookCard: {
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
      // The artwork's plate — the SAME vocabulary as the podcast row's
      // and the music row's: a gold-dim plate with the glyph on it.
      //
      // The old row drew a bare glyph on the border colour with no plate
      // at all, so a book with no cover was a hole in the list.
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
