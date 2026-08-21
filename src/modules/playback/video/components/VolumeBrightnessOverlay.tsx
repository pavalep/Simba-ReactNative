import React, {useEffect, useRef, useMemo, useCallback} from 'react';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../../../theme';

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
          backgroundColor: colors.background.highlightStrong,
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
          marginTop: 10,
          letterSpacing: 0.3,
          textShadowOffset: {width: 0, height: 1},
          textShadowRadius: 3,
        },
        iconContainer: {
          width: 22,
          height: 22,
          marginTop: 6,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconOverlay: {
          position: 'absolute',
        },
      }),
    [colors],
  );

  useEffect(() => {
    if (visible) {
      // V6 9.4.1: animate fade-in too. The previous code snapped to 1
      // instantly which felt jarring when the user started a swipe
      // gesture.
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
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

  // V6 9.4.2: smooth value animation. The fill height jumps on every
  // gesture tick because the parent updates the value at native
  // refresh rate. Wrapping it in an Animated.Value and using
  // useNativeDriver: true gives us a buttery smooth bar that lags
  // ~80ms behind the gesture — feels responsive without flickering.
  const fillHeightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, value));
    Animated.timing(fillHeightAnim, {
      toValue: clamped,
      duration: 80,
      useNativeDriver: false, // height is a layout property; cannot use native driver
    }).start();
  }, [value, fillHeightAnim]);

  // Label animates with the bar so the percent number doesn't jump
  const labelOpacity = useRef(new Animated.Value(1)).current;

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
  const fillHeight = fillHeightAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, BAR_HEIGHT],
  });
  const isVolume = type === 'volume';
  const fillColor = isVolume ? colors.accent.gold : colors.text.primary;
  const label = isVolume ? `Vol ${Math.round(clamped)}%` : `Bright ${Math.round(clamped)}%`;

  const getIconOverlayStyle = useCallback(
    (opacity: Animated.Value) => ({
      position: 'absolute' as const,
      opacity,
    }),
    [],
  );

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
        {/* Fill — animated via fillHeightAnim for smooth gesture tracking */}
        <Animated.View
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
      {/* Icon — cross-fade between volume and brightness (vector) */}
      <View style={styles.iconContainer}>
        <Animated.View style={getIconOverlayStyle(volumeIconOpacity)}>
          <SvgIcon
            name={clamped === 0 ? 'volumeMute' : 'volume'}
            size={20}
            color={fillColor}
          />
        </Animated.View>
        <Animated.View style={getIconOverlayStyle(brightnessIconOpacity)}>
          <SvgIcon name="sun" size={20} color={fillColor} />
        </Animated.View>
      </View>
    </Animated.View>
  );
};
