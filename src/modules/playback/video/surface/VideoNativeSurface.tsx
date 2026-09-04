/**
 * @deprecated V11 inline-mount surface (Phase 47 deletion target).
 * Phase 41 flipped `USE_DEDICATED_PLAYER_ACTIVITY` to `true`; V12's
 * `PlayerActivity` mounts its own native `MpvRenderView` (in
 * `com.simba.player.mpv.MpvRenderView`) and exposes it via the
 * module's `PlayerSurface` TS component. Consumers should NOT use
 * `VideoNativeSurface` directly anymore — use `<PlayerSurface />` from
 * `@simba/react-native-media-player` instead.
 *
 * This file is kept for the emergency V11 rollback path
 * (`USE_DEDICATED_PLAYER_ACTIVITY = false`). Phase 47 deletes it.
 */
import React from 'react';
import {
  requireNativeComponent,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface VideoNativeSurfaceProps {
  readonly nativePtr: number;
  readonly style?: StyleProp<ViewStyle>;
}

const NativeMpvRenderView = requireNativeComponent<VideoNativeSurfaceProps>(
  'MpvRenderView',
);

/**
 * Stable V3 render surface. The presentation host must mount one instance for
 * the session and change its geometry rather than replacing this component
 * during full/mini/PiP transitions.
 */
export const VideoNativeSurface = React.memo(function VideoNativeSurfaceImpl({
  nativePtr,
  style,
}: VideoNativeSurfaceProps) {
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
