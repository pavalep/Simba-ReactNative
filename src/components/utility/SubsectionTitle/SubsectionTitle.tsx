// ─── SubsectionTitle ──────────────────────────────────────────
// A small centered title with horizontal rules on either side, used to
// group per-user shelves (e.g. "Your Library") into a distinct parent
// block on the Home page.
//
// Renders as:   ──────── Your Library ────────
//
// v9f: bumped the label alpha from 0.8 → 0.9 per user feedback
// ("more"). Lines stay at the theme's own `goldGlow` — those were
// right. The label is the visual anchor of the divider; the rules
// are quiet support.
//
// v9g (2026-11-10): the label's gold is READ from the theme and the
// alpha is applied to it (`withAlpha`). It used to be a hard-coded
// `rgba(...)` pair — one per theme — and the pair was swapped, so
// light mode drew the dark theme's gold and dark mode drew the
// light one's. See the note at the colour below.
//
// The design literature for "── Title ──" dividers converges on
// one principle: a good divider is a "quiet seam in fabric, a
// pause in a sentence." It must be present enough to mark a
// section break, quiet enough that you don't notice it. Most
// modern apps (Spotify, Apple Music, YouTube Music) skip the
// pattern entirely in favor of bold heading + whitespace. The
// editorial italic + thin lines is the SIMBA-specific twist —
// the brand has Cormorant Garamond, so the divider reads as a
// chapter break, not a section header.
//
// v9 history:
//   v9   — full gold, 18 px. Read as "attention-seeking".
//   v9b  — goldGlow (0.25 alpha), 16 px. Read as "invisible".
//   v9c  — gold at 0.6 alpha, 18 px. "Tad bit more visible".
//   v9d  — gold at 0.7 alpha, 18 px. "More".
//   v9e  — gold at 0.8 alpha, 18 px. "More".
//   v9f  — gold at 0.9 alpha, 18 px. Current.
//
// Variants:
//   • `overline`     — Inter Medium 11 px, gray. Legacy.
//   • `displaySans`  — Manrope SemiBold 22 px, black. The
//                      original v7 divider. Kept for callers that
//                      still pass it.
//   • `displaySerif` — Cormorant Garamond Italic 18 px, 0.9
//                      gold. v9f default for the Home
//                      "Your Library" / "Discover" dividers.
//
// Why a typography override (not a new token):
//   The `displaySerif` typography token is 48 px Cormorant Bold,
//   sized for hero detail titles. A 18 px italic divider is a
//   one-off scale + style — promoting it to a token would create
//   noise. The SubsectionTitle owns its visual identity.

import React from 'react';
import {View, StyleSheet, type TextStyle} from 'react-native';
import {useTheme} from '../../../theme';
import {withAlpha} from '../../../theme/color';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';

interface SubsectionTitleProps {
  label: string;
  /**
   * `overline` (default) — Inter overline, 11 px, gray. Legacy look.
   * `displaySans`       — Manrope SemiBold 22 px, primary text. v7.
   * `displaySerif`      — Cormorant Garamond Italic 18 px, 0.9 gold.
   */
  variant?: 'overline' | 'displaySans' | 'displaySerif';
}

export const SubsectionTitle: React.FC<SubsectionTitleProps> = React.memo(
  ({label, variant = 'overline'}) => {
    const {colors} = useTheme();
    const isDisplaySans = variant === 'displaySans';
    const isDisplaySerif = variant === 'displaySerif';

    // v9f: rules at goldGlow (0.25 alpha) — present as a
    // decorative line, not a hard separator. The label is the
    // focal point of the divider, the rules are quiet support.
    const lineColor = isDisplaySerif
      ? colors.accent.goldGlow
      : colors.border.subtle;

    // v9f: 0.9 alpha on the brand gold.
    //
    // THE GOLD IS THE THEME'S GOLD. It used to be a hard-coded pair of
    // `rgba(...)` literals — one per theme — and the pair was SWAPPED:
    // light mode drew the dark theme's gold (#C9A84C) and dark mode
    // drew the light one's (#B8922E), while `theme/tokens.ts` has it the
    // other way round (dark #C9A84C, light #B8922E). The component's own
    // comment stated the mapping correctly and the code did the opposite,
    // which is how it survived: a hard-coded colour is indistinguishable
    // from a correct one at the call site.
    //
    // Now the colour is READ from the theme and only the alpha is
    // applied, so the two cannot drift apart.
    const labelGold = withAlpha(colors.accent.gold, 0.9);

    const labelColor = isDisplaySerif
      ? labelGold
      : isDisplaySans
        ? colors.text.primary
        : colors.text.tertiary;

    // Cormorant Garamond Italic 18 — distinct from the Manrope
    // rail titles, brand-cohesive with the wordmark. The
    // `displaySerif` AppText variant already sets the Cormorant
    // family, so we only need to override size + style.
    //
    // 2026-11-12: the weight is 400, NOT the token's 700.
    //
    // The Cormorant family ships three faces — regular, bold and
    // italic — and the weight selects the file
    // (`src/constants/fontFamily.ts`): 700 + italic asks for
    // `Cormorant Garamond_bold_italic.ttf`, which DOES NOT SHIP.
    // React Native then falls back silently, and the fallback is
    // not the same face it measured with: the label was MEASURED
    // with one typeface and DRAWN with another, so the drawn text
    // was wider than its own box and the LAST CHARACTER was cut
    // off — "Librar", "Accoun". It happened on every divider in
    // the app (Home's "Your Library", the Profile's groups, the
    // About page's "More").
    //
    // 400 + italic asks for `Cormorant Garamond_italic.ttf`, which
    // ships, and is the same face the brand lockup's tagline uses
    // (`src/constants/brand.ts`, `LOCKUP_TAGLINE`).
    const displaySerifOverride: TextStyle = {
      fontFamily: FONT_FAMILY.cormorant.italic,
      fontWeight: '400',
      fontSize: 18,
      lineHeight: 24,
      fontStyle: 'italic',
      letterSpacing: 0,
    };

    return (
      <View
        style={styles.root}
        accessibilityRole="header"
        accessibilityLabel={label}>
        <View style={[styles.rule, {backgroundColor: lineColor}]} />
        {/* v9b: bumped horizontal padding around the label from
            spacing.md (12) to spacing.xl (20) so the lines sit
            further from the text. The label owns its own
            horizontal padding so the line breathing room is
            independent of the label's intrinsic italic width. */}
        <View style={styles.labelWrap}>
          <AppText
            variant={isDisplaySerif ? 'displaySerif' : variant}
            color={labelColor}
            style={isDisplaySerif ? displaySerifOverride : styles.label}>
            {label}
          </AppText>
        </View>
        <View style={[styles.rule, {backgroundColor: lineColor}]} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  // v7: no font/letter-spacing overrides. The typography
  // token (overline or displaySans) drives the visual. Spacing
  // around the label is layout, not typography — that's the
  // only thing this style controls.
  label: {
    marginHorizontal: spacing.md,
  },
  // v9b: dedicated padding for the serif variant so the rule →
  // label gap is wide enough that the italic label reads as a
  // floating accent, not as a label crammed between two lines.
  labelWrap: {
    paddingHorizontal: spacing.xl,
  },
});





