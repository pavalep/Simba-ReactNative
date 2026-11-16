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
      // The artwork's plate — the SAME vocabulary as the detail hero's
      // cover tile, the "My Podcasts" row's circle and the Home shelf's
      // circle: a gold-dim plate with the podcast glyph on it.
      //
      // It used to be a bare glyph at `opacity: 0.4` over the
      // background, which was right for a feed that carries no artwork
      // at all (a permanent state). It is wrong for a cover that is
      // still arriving: the plate is drawn at 15 % gold under a glyph at
      // 15 % gold, so the whole tile came out at about 6 % — legible in
      // a pixel probe and invisible to a person, which is the same hole
      // the tile was added to close.
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
