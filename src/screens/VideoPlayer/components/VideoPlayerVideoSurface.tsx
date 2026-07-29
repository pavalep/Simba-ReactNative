import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
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
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerVideoSurface: React.FC<VideoPlayerVideoSurfaceProps> = React.memo(({
  nativePtr,
  showVideoSurface,
  isPlaying,
  controlsVisible,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.primary,
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
    [colors],
  );

  return (
    <View style={styles.container}>
      {showVideoSurface && (
        <MpvRenderViewNative
          nativePtr={nativePtr}
          style={StyleSheet.absoluteFill}
        />
      )}
      {!controlsVisible && !isPlaying && (
        <View style={styles.centerPlayBtnOverlay}>
          <View style={styles.centerPlayBtn}>
            <AppText style={styles.centerPlayIcon}>{'▶'}</AppText>
          </View>
        </View>
      )}
    </View>
  );
});

VideoPlayerVideoSurface.displayName = 'VideoPlayerVideoSurface';
