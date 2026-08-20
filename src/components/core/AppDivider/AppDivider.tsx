import {StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';

export interface AppDividerProps {
  inset?: number;
  style?: ViewStyle;
}

export const AppDivider: React.FC<AppDividerProps> = ({inset = 0, style}) => {
  const {colors} = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.base, {backgroundColor: colors.border.subtle, marginHorizontal: inset}, style]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
});
