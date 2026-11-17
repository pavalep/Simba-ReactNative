// ─── Music — TrackCard styles ───────────────────────────────────────
// Row-card variant for Music (the only variant — Jamendo tracks render
// as horizontal rows with thumb + meta, never as a grid).
// Thumb is 52×52 with rounded corners.
//
// The row OPENS THE TRACK'S OWN PAGE, so there is no play button
// inside it: a gold disc in a row that already carries one action
// read as a second button that did nothing.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createTrackCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    trackCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
    },
    thumbWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbImage: {
      width: 52,
      height: 52,
    },
    thumbPlaceholder: {
      // The artwork's plate — the SAME vocabulary as the podcast row's,
      // the detail hero's cover and the "My Podcasts" circle: a gold-dim
      // plate with the glyph on it.
      //
      // It used to be a bare glyph at `opacity: 0.4` over the
      // background, which was right for a track that carries no artwork
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
    trackInfo: {
      flex: 1,
      marginLeft: spacing.md,
      gap: 1,
    },
    trackName: {
      // The weight lives in the FAMILY key, not a `fontWeight` prop:
      // `fontWeight: '600'` on the family `Inter` asks Android for
      // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops
      // the suffix below weight 700), so the SemiBold face was
      // unreachable and the title was drawn in Inter REGULAR.
      fontFamily: FONT_FAMILY.inter.semibold,
      lineHeight: 18,
    },
    trackRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
  });
