import React, {useEffect, useMemo, useRef} from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  requireNativeComponent,
} from 'react-native';
import type {ViewStyle} from 'react-native';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../../../theme';

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
  const showCenterPlay = !controlsVisible && !isPlaying && isLoaded;

  // Center play button: scale-in entrance + soft outer glow halo
  const centerScale = useRef(new Animated.Value(0.6)).current;
  const centerOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (showCenterPlay) {
      // Entrance: scale 0.6 → 1.0, fade in, halo pulses softly
      Animated.parallel([
        Animated.spring(centerScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 100,
        }),
        Animated.timing(centerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1.4,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(centerScale, {
          toValue: 0.6,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(centerOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCenterPlay, centerScale, centerOpacity, haloOpacity, haloScale]);

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
        centerPlayBtnWrap: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Halo: a larger transparent gold disc that sits behind the play
        // button and gives it a Netflix-grade glow.
        centerPlayHalo: {
          position: 'absolute',
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.accent.gold,
        },
        // Center play button: 72px translucent dark disc with the play icon
        // on top. Slightly bigger than a default to read against any video.
        centerPlayBtn: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.background.scrimMid,
          borderWidth: 1,
          borderColor: colors.border.emphasis,
          alignItems: 'center',
          justifyContent: 'center',
          // Soft shadow
          shadowColor: colors.shadow,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 8,
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

      {/* Center play button: shown only when paused + controls hidden + loaded.
          Composed of a soft gold halo + a dark glass disc + the play icon.
          Tappable: tap → play/pause (works alongside the gesture layer). */}
      {showCenterPlay && (
        <View style={styles.centerPlayBtnWrap} pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerPlayHalo,
              {opacity: haloOpacity, transform: [{scale: haloScale}]},
            ]}
          />
          <Animated.View
            style={{transform: [{scale: centerScale}], opacity: centerOpacity}}>
            <TouchableOpacity
              style={styles.centerPlayBtn}
              onPress={onPlayPause}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Play">
              <SvgIcon name="play" size={32} color={colors.text.bright} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
});

VideoPlayerVideoSurface.displayName = 'VideoPlayerVideoSurface';
