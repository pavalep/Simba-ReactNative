import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  requireNativeComponent,
} from 'react-native';
import type {ViewStyle} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';

// ─── Native video surface component ─────────────────────────

interface MpvRenderViewProps {
  nativePtr: number;
  style?: ViewStyle;
}

const MpvRenderViewNative =
  requireNativeComponent<MpvRenderViewProps>('MpvRenderView');

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerVideoSurfaceProps {
  nativePtr: number;
  showVideoSurface: boolean;
  isPlaying: boolean;
  controlsVisible: boolean;
  loadingPhase: string;
  onPlayPause?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerVideoSurface: React.FC<VideoPlayerVideoSurfaceProps> = React.memo(({
  nativePtr,
  showVideoSurface,
  isPlaying,
  controlsVisible,
  loadingPhase,
  onPlayPause,
}) => {
  const {colors} = useTheme();

  const isLoaded = loadingPhase === 'ready';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          // Black backdrop during load: the native TextureView defaults to
          // white before mpv renders its first frame — this prevents the
          // white-screen flash until the video surface is ready.
          backgroundColor: isLoaded ? colors.background.primary : colors.shadow,
        },
        centerPlayBtnOverlay: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerPlayBtn: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.background.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerPlayIcon: {
          fontSize: 28,
          color: colors.text.primary,
        },
      }),
    [colors, isLoaded],
  );

  return (
    <View style={styles.container}>
      {showVideoSurface && (
        <MpvRenderViewNative
          nativePtr={nativePtr}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Center play button: only when paused AND fully loaded (not during
          initial load — the loading overlay covers that — and not while
          actively playing, so the button never floats over active video).
          Tappable: tap → play/pause (works alongside the gesture layer). */}
      {!controlsVisible && !isPlaying && isLoaded && (
        <View style={styles.centerPlayBtnOverlay}>
          <TouchableOpacity
            style={styles.centerPlayBtn}
            onPress={onPlayPause}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Play">
            <AppText style={styles.centerPlayIcon}>{'▶'}</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

VideoPlayerVideoSurface.displayName = 'VideoPlayerVideoSurface';
