import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {VideoIcon, type VideoIconName} from './VideoIcon';

export interface VideoControlButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  readonly icon: VideoIconName;
  readonly label: string;
  readonly size?: 'compact' | 'regular' | 'primary';
  readonly hint?: string;
  readonly iconColor?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function VideoControlButton({
  icon,
  label,
  size = 'regular',
  hint,
  iconColor = cinemaColors.text.bright,
  style,
  disabled,
  ...props
}: VideoControlButtonProps) {
  const iconSize = size === 'primary' ? 31 : size === 'compact' ? 20 : 24;
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({pressed}) => [
        styles.base,
        styles[size],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <VideoIcon name={icon} size={iconSize} color={size === 'primary' ? '#14532D' : iconColor} />
      {size === 'primary' ? <Text style={styles.hiddenText}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  compact: {
    minWidth: 44,
    minHeight: 44,
  },
  regular: {
    minWidth: 52,
    minHeight: 52,
  },
  primary: {
    minWidth: 68,
    minHeight: 68,
    borderRadius: 34,
    backgroundColor: cinemaColors.text.bright,
  },
  disabled: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.68,
  },
  hiddenText: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
