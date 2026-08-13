// ─── SubsectionTitle ──────────────────────────────────────────
// A small centered title with horizontal rules on either side, used to
// group per-user shelves (e.g. "Your Library") into a distinct parent
// block on the Home page.
//
// Renders as:   ──────── Your Library ────────
//
// v7: the v7 brand spec calls for the "Your Library" / "Discover"
// subsection dividers to render in Manrope (`displaySans`).
// Pass `variant="displaySans"` to opt in. The token size (22 px
// SemiBold) wins — no inline fontSize override. The divider is
// visually larger than before, which matches the spec: brand
// typography over Inter overline for these parent-block titles.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface SubsectionTitleProps {
  label: string;
  /**
   * `overline` (default) — Inter overline, 11 px. The legacy
   *   look. Use for minor separators that should not draw the eye.
   * `displaySans` — Manrope SemiBold 22 px. v7 default for the
   *   Home "Your Library" / "Discover" dividers.
   */
  variant?: 'overline' | 'displaySans';
}

export const SubsectionTitle: React.FC<SubsectionTitleProps> = React.memo(
  ({label, variant = 'overline'}) => {
    const {colors} = useTheme();
    const isDisplaySans = variant === 'displaySans';
    return (
      <View
        style={styles.root}
        accessibilityRole="header"
        accessibilityLabel={label}>
        <View
          style={[styles.rule, {backgroundColor: colors.border.subtle}]}
        />
        <AppText
          variant={variant}
          color={isDisplaySans ? 'primary' : 'tertiary'}
          style={styles.label}>
          {label}
        </AppText>
        <View
          style={[styles.rule, {backgroundColor: colors.border.subtle}]}
        />
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
});
