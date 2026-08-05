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
 * a 44px circular elevated touch target with a left-pointing chevron
 * (the chevronRight asset flipped 180° — no font dependency).
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
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.root,
        {backgroundColor: colors.background.elevated},
        style,
      ]}>
      <SvgIcon
        name="chevronRight"
        size={24}
        color={colors.text.primary}
        style={{transform: [{rotate: '180deg'}]}}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
