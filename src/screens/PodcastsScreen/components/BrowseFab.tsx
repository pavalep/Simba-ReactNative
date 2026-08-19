// ─── Podcasts Screen — BrowseFab ──────────────────────────────────────
// Floating action button (gold, bottom-right) that opens the section
// options sheet. Keyboard-aware (hidden while typing so it never floats
// over the keyboard), config-driven visibility, badge with active-count.

import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useKeyboard} from '../../../hooks/useKeyboard';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

export interface BrowseFabProps {
  onPress: () => void;
  accessibilityLabel: string;
  visible?: boolean;
  badgeCount?: number;
}

export const BrowseFab: React.FC<BrowseFabProps> = ({
  onPress,
  accessibilityLabel,
  visible = true,
  badgeCount = 0,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {keyboardVisible} = useKeyboard();

  if (!visible || keyboardVisible) return null;

  return (
    <View
      style={[styles.overlay, {bottom: insets.bottom + spacing.lg}]}
      pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          badgeCount > 0
            ? `${accessibilityLabel}, ${badgeCount} active`
            : accessibilityLabel
        }
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent.gold,
            shadowColor: colors.accent.gold,
          },
        ]}>
        <SvgIcon name="sliders" size={24} color={colors.text.inverse} />
      </TouchableOpacity>
      {badgeCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.background.primary,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText variant="caption" color="accent" style={styles.badgeText}>
            {badgeCount}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});