import React from 'react';
import {
  requireNativeComponent,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface VideoV3NativeSurfaceProps {
  readonly nativePtr: number;
  readonly style?: StyleProp<ViewStyle>;
}

const NativeMpvRenderView = requireNativeComponent<VideoV3NativeSurfaceProps>(
  'MpvRenderView',
);

/**
 * Stable V3 render surface. The presentation host must mount one instance for
 * the session and change its geometry rather than replacing this component
 * during full/mini/PiP transitions.
 */
export const VideoV3NativeSurface = React.memo(function VideoV3NativeSurfaceImpl({
  nativePtr,
  style,
}: VideoV3NativeSurfaceProps) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const supportedStyle = {...flattenedStyle};
  // Android TextureView rejects React Native background drawables. The
  // cinematic background belongs to the V3 projection shell, not this native
  // surface. Strip it at the bridge boundary so future callers cannot crash
  // Fabric by passing backgroundColor through to MpvRenderView.
  delete supportedStyle.backgroundColor;

  return (
    <NativeMpvRenderView
      nativePtr={nativePtr}
      style={[styles.surface, supportedStyle]}
    />
  );
});

const styles = StyleSheet.create({
  surface: {
    ...StyleSheet.absoluteFill,
  },
});
