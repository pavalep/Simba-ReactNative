// ────────────────────────────────────────────────────────
// Simba Player — Video Player Gesture Layer
// ────────────────────────────────────────────────────────
// Phase 13: Refactored to use usePlayerGestures hook.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {usePlayerGestures, GestureCallbacks} from '../../../hooks/usePlayerGestures';

interface Props extends GestureCallbacks {
  children?: React.ReactNode;
}

const VideoPlayerGestureLayer: React.FC<Props> = (props) => {
  const {
    children,
    ...gestureCallbacks
  } = props;

  const {panHandlers} = usePlayerGestures(gestureCallbacks);

  return (
    <View
      style={StyleSheet.absoluteFill}
      {...panHandlers}
      accessible
      accessibilityLabel="Video playback area"
      accessibilityHint="Double-tap the left or right side to seek 10 seconds. Swipe up for details. Swipe down to enter picture-in-picture.">
      {children}
    </View>
  );
};

export default VideoPlayerGestureLayer;
