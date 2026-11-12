// ─── Movies — MovieCard styles ───────────────────────────────────────
// The 16:9 hero card visual stack:
//   • two image layers (base + remote fade-in)
//   • a single linear-gradient overlay (bottom 62%)
//   • a bottom-left text overlay (title + meta)
//
// Geometry is fixed: zero-radius full-bleed mosaic, gapless rows. Two
// row-children variants exist (`heroCard` flex:1 vs `heroCardLonely`
// explicit 50%) so a sole trailing item (odd item count) renders at
// half-width instead of stretching to full screen.

import {StyleSheet} from 'react-native';
import {spacing, type ColorTokens} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const createMovieCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    heroCard: {
      // `flex: 1` so each row child claims half the row width.
      flex: 1,
      aspectRatio: 16 / 9,
      borderRadius: 0,
      overflow: 'hidden',
    },
    heroCardLonely: {
      width: '50%',
      aspectRatio: 16 / 9,
      borderRadius: 0,
      overflow: 'hidden',
    },
    heroImageLayer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      overflow: 'hidden',
    },
    heroPlaceholder: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPlaceholderGradient: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    heroPlaceholderIcon: {
      opacity: 0.4,
    },
    heroResolving: {
      backgroundColor: colors.background.scrimDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroOverlayBg: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '62%',
    },
    heroOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      // The page's one gutter (16 dp), not 12: the first column's titles
      // have to line up with the search field and the header above
      // them. The mosaic itself stays full-bleed — the cards butt
      // against each other and the screen edge, which is the point of
      // the grid.
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: 4,
    },
    heroTitle: {
      color: colors.text.bright,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 18,
      letterSpacing: 0.1,
      textShadowColor: colors.shadow,
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 6,
    },
    heroMeta: {
      color: colors.text.onMediaSoft,
      // The weight lives in the FAMILY key, not in a `fontWeight` prop:
      // `fontWeight: '500'` on the family `Inter` asks Android for
      // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops
      // the suffix below weight 700), so the Medium face was unreachable
      // and the meta line was drawn in Inter REGULAR.
      fontFamily: FONT_FAMILY.inter.medium,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 0.2,
      textShadowColor: colors.shadow,
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 4,
    },
  });
