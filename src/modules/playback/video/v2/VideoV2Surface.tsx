import React from 'react';
import {StyleSheet, View, requireNativeComponent} from 'react-native';
import type {ViewStyle} from 'react-native';

interface VideoV2NativeSurfaceProps {
  nativePtr: number;
  style?: ViewStyle;
}

const VideoV2NativeSurface = requireNativeComponent<VideoV2NativeSurfaceProps>('MpvRenderView');

interface VideoV2SurfaceProps {
  nativePtr: number;
  showVideoSurface: boolean;
  backgroundColor: string;
  style?: ViewStyle;
}

export const VideoV2Surface: React.FC<VideoV2SurfaceProps> = React.memo(({nativePtr, showVideoSurface, backgroundColor, style}) => (
  <View pointerEvents="none" style={[styles.surface, {backgroundColor}, style]}>
    {showVideoSurface ? <VideoV2NativeSurface nativePtr={nativePtr} style={StyleSheet.absoluteFill} /> : null}
  </View>
));

VideoV2Surface.displayName = 'VideoV2Surface';

const styles = StyleSheet.create({
  surface: {flex: 1, overflow: 'hidden'},
});
