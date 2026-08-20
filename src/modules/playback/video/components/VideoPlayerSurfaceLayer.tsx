import React from 'react';
import {Animated, StyleSheet} from 'react-native';
import {VideoPlayerVideoSurface} from './VideoPlayerVideoSurface';
import VideoPlayerGestureLayer from './VideoPlayerGestureLayer';
import {useTransport} from '../../../../contexts/TransportContext';

export interface VideoPlayerSurfaceLayerProps {
  pipScale: Animated.Value;
  pipTranslateX: Animated.Value;
  pipTranslateY: Animated.Value;
  nativePtr: number;
  showVideoSurface: boolean;
  controlsVisible: boolean;
  loadingPhase: string;
  onSingleTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onVolumeChange: (delta: number) => void;
  onBrightnessChange: (delta: number) => void;
  onVolumeGestureEnd: () => void;
  onBrightnessGestureEnd: () => void;
  onPlayPause?: () => void;
}

/**
 * Stable boundary around the native TextureView.
 *
 * Keeping this component outside VideoPlayerScreen prevents normal UI state
 * changes (volume feedback, sheets, toolbar visibility) from recreating the
 * native surface and producing a black flash or lost first frame.
 */
export const VideoPlayerSurfaceLayer = React.memo<VideoPlayerSurfaceLayerProps>(({
  pipScale,
  pipTranslateX,
  pipTranslateY,
  nativePtr,
  showVideoSurface,
  controlsVisible,
  loadingPhase,
  onSingleTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onSwipeUp,
  onSwipeDown,
  onVolumeChange,
  onBrightnessChange,
  onVolumeGestureEnd,
  onBrightnessGestureEnd,
  onPlayPause,
}) => {
  const {isPlaying} = useTransport();

  return <VideoPlayerGestureLayer
    onSingleTap={onSingleTap}
    onDoubleTapLeft={onDoubleTapLeft}
    onDoubleTapRight={onDoubleTapRight}
    onSwipeUp={onSwipeUp}
    onSwipeDown={onSwipeDown}
    onVolumeChange={onVolumeChange}
    onBrightnessChange={onBrightnessChange}
    onVolumeGestureEnd={onVolumeGestureEnd}
    onBrightnessGestureEnd={onBrightnessGestureEnd}>
    <Animated.View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            {scale: pipScale},
            {translateX: pipTranslateX},
            {translateY: pipTranslateY},
          ],
        },
      ]}>
      <VideoPlayerVideoSurface
        nativePtr={nativePtr}
        showVideoSurface={showVideoSurface}
        isPlaying={isPlaying}
        controlsVisible={controlsVisible}
        loadingPhase={loadingPhase}
        onPlayPause={onPlayPause}
      />
    </Animated.View>
  </VideoPlayerGestureLayer>;
});

VideoPlayerSurfaceLayer.displayName = 'VideoPlayerSurfaceLayer';
