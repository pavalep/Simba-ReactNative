// ─── SubsectionTitle ──────────────────────────────────────────
// A small centered title with horizontal rules on either side, used to
// group per-user shelves (e.g. "Your Library") into a distinct parent
// block on the Home page. Visually subordinate to the main section
// titles (h2), so it reads as a separator rather than another header.
//
// Renders as:   ──────── Your Library ────────

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface SubsectionTitleProps {
  label: string;
}

export const SubsectionTitle: React.FC<SubsectionTitleProps> = React.memo(
  ({label}) => {
    const {colors} = useTheme();
    return (
      <View
        style={styles.root}
        accessibilityRole="header"
        accessibilityLabel={label}>
        <View
          style={[styles.rule, {backgroundColor: colors.border.subtle}]}
        />
        <AppText
          variant="overline"
          color="tertiary"
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
  label: {
    marginHorizontal: spacing.md,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
});
