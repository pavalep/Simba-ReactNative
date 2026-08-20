import {StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../AppText/AppText';

export interface AppBadgeProps {
  label: string;
  tone?: 'accent' | 'neutral' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({label, tone = 'neutral', style}) => {
  const {colors} = useTheme();

  const palette = {
    accent: {backgroundColor: colors.accent.goldDim, color: colors.accent.gold},
    neutral: {backgroundColor: colors.background.highlight, color: colors.text.secondary},
    success: {backgroundColor: `${colors.semantic.success}26`, color: colors.semantic.success},
    warning: {backgroundColor: `${colors.semantic.warning}26`, color: colors.semantic.warning},
    error: {backgroundColor: colors.semantic.errorDim, color: colors.semantic.error},
  }[tone];

  return (
    <View style={[styles.base, {backgroundColor: palette.backgroundColor}, style]}>
      <AppText variant="overline" style={{color: palette.color}} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
