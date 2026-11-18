// ─── Live TV — the row's styles ───────────────────────────────────────
//
// The row's visual contract, ported from the legacy tab-based Live TV
// screen so the row looks the same as it always has:
//
//   • 56×56 thumb (the logo image, with the app's own tile until it
//     decodes)
//   • name (bodySmall on the Semibold family) + category·country caption
//   • a trailing HEART when the channel is a favourite
//   • 32×32 round play button
//
// The trailing BOOKMARK glyph is gone: it showed the FAVOURITE state with
// another feature's icon, while the app's own favourite language is a
// heart. The state is announced too — the row's accessible name says
// whether the channel is a favourite, so a screen-reader user can tell a
// favourite channel from an ordinary one.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createChannelCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbTile: {
      // The artwork's plate — the SAME vocabulary as the podcast row's,
      // the music row's and the radio row's: a gold-dim plate with the
      // glyph on it.
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      // The weight lives in the FAMILY key, not a `fontWeight` prop:
      // `fontWeight: '600'` on the family `Inter` asks Android for
      // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops
      // the suffix below weight 700), so the SemiBold face was
      // unreachable and the channel name was drawn in Inter REGULAR.
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    playButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
