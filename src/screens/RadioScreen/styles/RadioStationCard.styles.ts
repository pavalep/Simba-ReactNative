// ─── Radio — station card styles ─────────────────────────────────────
// The browse row and the favourites row share ONE card, so the card's
// styles live in ONE place.
//
// The weight lives in the FAMILY key, not a `fontWeight` prop:
// `fontWeight: '600'` on the family `Inter` asks Android for
// `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops the
// suffix below weight 700), so the SemiBold face was unreachable and
// the station name was drawn in Inter REGULAR.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createRadioStationCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
      // The gap between two rows.
      //
      // It lives on the CARD, not in a `ItemSeparatorComponent`: the
      // house row (the Music screen's track card) carries its own bottom
      // margin, and a separator component has to be re-created on every
      // render of the list that owns it.
      marginBottom: spacing.sm,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbTile: {
      // The artwork's plate — the SAME vocabulary as the podcast row's and
      // the music row's: a gold-dim plate with the glyph on it. It used to
      // be a bare glyph straight on the row's background, which is the hole
      // this tile exists to close.
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    info: {flex: 1, gap: spacing.xs},
    name: {
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    metaBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 1,
      borderRadius: radius.sm - 2,
    },
    metaBadgeText: {fontSize: 10},
    playButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
