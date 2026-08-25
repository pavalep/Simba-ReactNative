import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import {AudioIcon, AudioIconName} from './AudioIcon';

interface AudioButtonProps {
  icon: AudioIconName;
  label: string;
  onPress: () => void;
  color: string;
  size?: number;
  backgroundColor?: string;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  icon,
  label,
  onPress,
  color,
  size = 44,
  backgroundColor = 'transparent',
  active = false,
  disabled = false,
  style,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{disabled, selected: active}}
    disabled={disabled}
    onPress={onPress}
    hitSlop={8}
    style={({pressed}) => [
      styles.base,
      {width: size, height: size, borderRadius: size / 2, backgroundColor},
      active && styles.active,
      pressed && styles.pressed,
      disabled && styles.disabled,
      style,
    ]}>
    <AudioIcon name={icon} size={Math.max(18, Math.round(size * 0.45))} color={color} />
  </Pressable>
);

const styles = StyleSheet.create({
  base: {alignItems: 'center', justifyContent: 'center'},
  active: {opacity: 1},
  pressed: {transform: [{scale: 0.94}], opacity: 0.72},
  disabled: {opacity: 0.36},
});
