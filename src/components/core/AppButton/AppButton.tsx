import React, {useMemo, useRef, useCallback} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../AppText/AppText';
import {ActivityOrb} from '../../feedback/ActivityOrb/ActivityOrb';
import {useHaptics} from '../../../hooks/useHaptics';

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
  hint?: string;
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
  hint,
  style,
  textStyle,
}) => {
  const {colors} = useTheme();
  const {medium: hapticMedium} = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sz = sizeConfig[sizeKey];

  const handlePressIn = useCallback(() => {
    hapticMedium();
    Animated.spring(scaleAnim, {toValue: 0.95, friction: 8, tension: 100, useNativeDriver: true}).start();
  }, [scaleAnim, hapticMedium]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {toValue: 1, friction: 3, tension: 200, useNativeDriver: true}).start();
  }, [scaleAnim]);

  const {bgColor, txtColor, bdColor} = useMemo(() => {
    if (disabled) {
      return {
        bgColor: colors.border.subtle,
        txtColor: colors.text.tertiary,
        bdColor: 'transparent',
      };
    }
    switch (variant) {
      case 'primary':
        return {
          bgColor: colors.accent.gold,
          txtColor: colors.text.primary,
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
  }, [disabled, colors, variant]);

  return (
    <Animated.View style={[{transform: [{scale: scaleAnim}]}]}>
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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{disabled: disabled || loading}}
        accessibilityLabel={loading ? `${title}, loading` : title}
        accessibilityHint={hint}>
        {loading ? (
          <ActivityOrb size={16} color={txtColor} />
        ) : (
          <View style={[styles.inner, {flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row'}]}>
            {icon && <View style={styles.iconSlot}>{icon}</View>}
            <AppText
              variant="button"
              style={[
                {
                  color: txtColor,
                  fontSize: sz.fs,
                },
                textStyle,
              ]}
              numberOfLines={1}>
              {title}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
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
