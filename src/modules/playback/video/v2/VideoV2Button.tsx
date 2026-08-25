import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {VideoV2Icon, type VideoV2IconName} from './VideoV2Icon';

interface VideoV2ButtonProps {
  icon: VideoV2IconName;
  label: string;
  onPress: () => void;
  color: string;
  backgroundColor?: string;
  size?: number;
  selected?: boolean;
}

export const VideoV2Button: React.FC<VideoV2ButtonProps> = ({icon, label, onPress, color, backgroundColor = 'transparent', size = 44, selected = false}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{selected}}
    onPress={onPress}
    hitSlop={4}
    style={({pressed}) => [styles.button, {width: size, height: size, borderRadius: size / 2, backgroundColor}, pressed && styles.pressed]}>
    <VideoV2Icon name={icon} size={Math.min(26, size * 0.56)} color={color} />
    <Text accessible={false} style={styles.hiddenLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {alignItems: 'center', justifyContent: 'center'},
  pressed: {opacity: 0.68, transform: [{scale: 0.96}]},
  hiddenLabel: {position: 'absolute', width: 1, height: 1, opacity: 0},
});
