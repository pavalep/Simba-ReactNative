// ─── Podcasts — PodcastRow styles ──────────────────────────────────────
// Single-column list row (the brand — no view group on this section):
//
//   [60×60 thumb]  Title (1 line)
//                  Author (secondary)

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createPodcastRowStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    row: {
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
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.4,
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
