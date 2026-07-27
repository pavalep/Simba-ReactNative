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
      {...panHandlers}>
      {children}
    </View>
  );
};

export default VideoPlayerGestureLayer;
