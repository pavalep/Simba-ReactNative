import React, {useEffect, useRef, useMemo} from 'react';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';

interface VolumeBrightnessOverlayProps {
  type: 'volume' | 'brightness';
  value: number; // 0-100
  visible: boolean;
}

const BAR_HEIGHT = 180;
const BAR_WIDTH = 6;

/**
 * Animated vertical bar indicator for volume (left edge) and
 * brightness (right edge) gesture feedback.
 *
 * Shows a pill-shaped vertical bar with percentage label.
 * Animates opacity in/out based on `visible` prop.
 */
export const VolumeBrightnessOverlay: React.FC<
  VolumeBrightnessOverlayProps
> = ({type, value, visible}) => {
  const {colors} = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const prevVisible = useRef(false);

  // Icon morph: cross-fade between volume and brightness icons
  const volumeIconOpacity = useRef(new Animated.Value(1)).current;
  const brightnessIconOpacity = useRef(new Animated.Value(0)).current;
  const prevTypeRef = useRef(type);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: '25%',
          zIndex: 100,
          alignItems: 'center',
        },
        leftEdge: {left: 16},
        rightEdge: {right: 16},
        track: {
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: colors.background.glass,
          justifyContent: 'flex-end',
          overflow: 'hidden',
        },
        fill: {
          width: BAR_WIDTH,
          borderRadius: BAR_WIDTH / 2,
        },
        label: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 8,
          textShadowOffset: {width: 0, height: 1},
          textShadowRadius: 3,
        },
        icon: {fontSize: 18, marginTop: 4},
      }),
    [colors],
  );

  useEffect(() => {
    if (visible) {
      opacityAnim.setValue(1);
    } else if (prevVisible.current) {
      // Fade out when transitioning from visible→hidden
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    prevVisible.current = visible;
  }, [visible, opacityAnim]);

  // Icon morph transition when type changes
  useEffect(() => {
    if (prevTypeRef.current !== type) {
      const fadeOut = prevTypeRef.current === 'volume' ? volumeIconOpacity : brightnessIconOpacity;
      const fadeIn = type === 'volume' ? volumeIconOpacity : brightnessIconOpacity;
      Animated.parallel([
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      prevTypeRef.current = type;
    } else {
      // Initial state
      volumeIconOpacity.setValue(type === 'volume' ? 1 : 0);
      brightnessIconOpacity.setValue(type === 'brightness' ? 1 : 0);
    }
  }, [type, volumeIconOpacity, brightnessIconOpacity]);

  const clamped = Math.max(0, Math.min(100, value));
  const fillHeight = (clamped / 100) * BAR_HEIGHT;
  const isVolume = type === 'volume';
  const fillColor = isVolume ? colors.accent.gold : colors.text.primary;
  const label = isVolume ? `Vol ${Math.round(clamped)}%` : `Bright ${Math.round(clamped)}%`;

  return (
    <Animated.View
      style={[
        styles.container,
        isVolume ? styles.leftEdge : styles.rightEdge,
        {opacity: opacityAnim},
      ]}
      pointerEvents="none">
      {/* Pill track */}
      <View style={styles.track}>
        {/* Fill */}
        <View
          style={[
            styles.fill,
            {
              height: fillHeight,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
      <AppText
        style={[
          styles.label,
          {
            color: fillColor,
            textShadowColor: colors.background.primary,
          },
        ]}>
        {label}
      </AppText>
      {/* Icon — cross-fade between volume 🔊 and brightness ☀️ */}
      <View style={{width: 22, height: 22, marginTop: 4, alignItems: 'center', justifyContent: 'center'}}>
        <Animated.View style={{position: 'absolute', opacity: volumeIconOpacity}}>
          <AppText style={styles.icon}>{'\uD83D\uDD0A'}</AppText>
        </Animated.View>
        <Animated.View style={{position: 'absolute', opacity: brightnessIconOpacity}}>
          <AppText style={styles.icon}>{'\u2600\uFE0F'}</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
};
