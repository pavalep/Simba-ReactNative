import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';
import {BackButton} from '../../utility/BackButton/BackButton';

interface InternalHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon?: IconName;
    label?: string;
    onPress: () => void;
  };
}

export const InternalHeader: React.FC<InternalHeaderProps> = ({
  title,
  subtitle,
  rightAction,
}) => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          borderBottomColor: colors.border.subtle,
        },
      ]}>
      {/* Left action — shared BackButton (36px elevated chevron) */}
      <BackButton />

      {/* Right action slot — matches the BackButton width so the row stays
          balanced when both are present. */}
      {rightAction ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={rightAction.onPress}
          style={[styles.rightButton, {backgroundColor: colors.background.elevated}]}>
          {rightAction.icon ? (
            <SvgIcon name={rightAction.icon} size={18} color={colors.text.secondary} />
          ) : rightAction.label ? (
            <AppText variant="body2" color="accent">
              {rightAction.label}
            </AppText>
          ) : null}
        </TouchableOpacity>
      ) : (
        // Invisible spacer so the row keeps its trailing width when no
        // right action is supplied — keeps the back button anchored left.
        <View style={styles.rightSpacer} />
      )}

      {/* Title — absolutely positioned and centred horizontally in the full
          header width, regardless of the back button / right action widths.
          Sits on top of the action row so it can never be pushed off-centre.

          ONE title style for every internal page: Manrope SemiBold 22 px
          (`displaySans`). The seven informational pages used to opt in to
          `displaySerif` — a 48 px Cormorant Garamond Bold — which the
          owner called "too much big" on 2026-11-12, and which put the
          page title on a different scale from every other page in the
          app. The Profile's title is the reference.

          The `style={styles.title}` inline fontSize + letterSpacing
          still applies as overrides; the typography token supplies the
          fontFamily AND the weight (600). There is no `fontWeight`
          override here on purpose: the family key carries the weight
          (`FONT_FAMILY.manrope.semibold` → `Manrope SemiBold.ttf`), and
          a `fontWeight: '700'` on top of it would ask React Native for
          `Manrope SemiBold_bold.ttf`, which does not ship — the silent
          fallback CF-03 was about. */}
      <View style={styles.titleOverlay} pointerEvents="none">
        <AppText
          variant="displaySans"
          color="primary"
          numberOfLines={1}
          style={styles.title}>
          {title}
        </AppText>
        {subtitle && (
          <AppText
            variant="caption"
            color="tertiary"
            numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  titleOverlay: {
    // Overlay that spans the full header width so the title can be
    // centred horizontally independent of the back / right action widths.
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 96, // leave room for back + right action buttons
  },
  title: {
    // Manrope SemiBold 22 px — the token supplies the family AND the
    // weight (600). This style supplies the size, the tracking and the
    // centering. NO `fontWeight` here: the family key carries the
    // weight (CF-03).
    fontSize: 22,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  rightSpacer: {
    // Width matches the BackButton so the row stays balanced when no
    // right action is supplied.
    width: 36,
    height: 36,
  },
  rightButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
