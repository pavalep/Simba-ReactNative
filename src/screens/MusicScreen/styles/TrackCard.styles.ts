// ─── Music — TrackCard styles ───────────────────────────────────────
// Row-card variant for Music (the only variant — Jamendo tracks render
// as horizontal rows with thumb + meta + play button, never as a grid).
// Thumb is 52×52 with rounded corners; play button is 32×32.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const createTrackCardStyles = () =>
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
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.4,
    },
    trackInfo: {
      flex: 1,
      marginLeft: spacing.md,
      gap: 1,
    },
    trackName: {
      // The weight lives in the FAMILY key, not in a `fontWeight` prop:
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
    playButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
