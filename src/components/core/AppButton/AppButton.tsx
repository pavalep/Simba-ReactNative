import React, {useMemo} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeConfig: Record<ButtonSize, {px: number; py: number; fs: number; minH: number}> = {
  sm: {px: spacing.lg, py: spacing.sm, fs: 13, minH: 36},
  md: {px: spacing.xl, py: spacing.md, fs: 15, minH: 44},
  lg: {px: spacing.xxl, py: spacing.lg, fs: 17, minH: 52},
};

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size: sizeKey = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const {colors, isDark} = useTheme();
  const sz = sizeConfig[sizeKey];

  const {bgColor, txtColor, bdColor} = useMemo(() => {
    if (disabled) {
      return {
        bgColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        txtColor: colors.text.tertiary,
        bdColor: 'transparent',
      };
    }
    switch (variant) {
      case 'primary':
        return {
          bgColor: colors.accent.gold,
          txtColor: '#0A0A0C',
          bdColor: 'transparent',
        };
      case 'secondary':
        return {
          bgColor: colors.accent.goldDim,
          txtColor: colors.accent.gold,
          bdColor: 'transparent',
        };
      case 'outline':
        return {
          bgColor: 'transparent',
          txtColor: colors.accent.gold,
          bdColor: colors.accent.gold,
        };
      case 'text':
        return {
          bgColor: 'transparent',
          txtColor: colors.accent.gold,
          bdColor: 'transparent',
        };
    }
  }, [disabled, isDark, colors, variant]);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor: bdColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingHorizontal: sz.px,
          paddingVertical: sz.py,
          minHeight: sz.minH,
          alignSelf: fullWidth ? 'stretch' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={txtColor} />
      ) : (
        <View style={[styles.inner, {flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row'}]}>
          {icon && <View style={styles.iconSlot}>{icon}</View>}
          <Text
            style={[
              {
                color: txtColor,
                fontSize: sz.fs,
                fontWeight: '600',
              },
              textStyle,
            ]}
            numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconSlot: {},
});
