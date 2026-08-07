import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../SvgIcon';

interface BackButtonProps {
  /** Custom action; defaults to navigation.goBack() */
  onPress?: () => void;
  /** Extra styles, e.g. positioning over hero art */
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * The single canonical back button used across every screen header:
 * a 36px circular elevated touch target with a left-pointing chevron
 * (the chevronRight asset flipped 180° — no font dependency). The 8px
 * hitSlop keeps the effective tappable area at the 44px accessibility
 * minimum while letting the visual itself sit closer to the title.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  style,
  accessibilityLabel = 'Go back',
}) => {
  const navigation = useNavigation();
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => navigation.goBack())}
      activeOpacity={0.7}
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.root,
        {backgroundColor: colors.background.elevated},
        style,
      ]}>
      <SvgIcon
        name="chevronRight"
        size={20}
        color={colors.text.primary}
        style={{transform: [{rotate: '180deg'}]}}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
