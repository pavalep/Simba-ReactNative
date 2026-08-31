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
  readonly size?: 'compact' | 'regular' | 'primary' | 'mini' | 'utility';
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
  // v11 T7.2: 'mini' is a 32x32 size for the mini player's
  // play/expand/close row \u2014 the regular 'compact' is 44 px and
  // looks chunky in a 96-px-tall card.
  const iconSize =
    size === 'primary'
      ? 31
      : size === 'compact'
        ? 20
        : size === 'mini'
          ? 16
          : size === 'utility'
            ? 18
            : 24;
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      // v11 T10.1: utility chips are 36x36 visual but the spec
      // requires a 44 px hit target. The hitSlop expands the
      // touch area without changing the visual.
      hitSlop={size === 'utility' ? 4 : undefined}
      style={({pressed}) => [
        styles.base,
        styles[size],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <VideoIcon name={icon} size={iconSize} color={size === 'primary' ? cinemaColors.accent.primaryCTA : iconColor} />
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
  // v11 T10.1: utility size \u2014 36x36 visual, 44 px hit slop.
  // The hitSlop prop on the Pressable extends the touch target
  // to 44 px so we keep the a11y minimum even though the
  // visual chip is smaller.
  utility: {
    minWidth: 36,
    minHeight: 36,
  },
  regular: {
    minWidth: 52,
    minHeight: 52,
  },
  // v11 T7.2: mini size \u2014 32 px tap target, 16 px icon. Used in
  // the mini card's play/expand/close row so the three buttons
  // fit horizontally in the 86 px-tall card.
  mini: {
    minWidth: 32,
    minHeight: 32,
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
