import React, {useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  PanResponder,
  Animated,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';

// ─── Static styles for VolumeIcon ───────────────────────────
const iconStyles = StyleSheet.create({
  volIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 32,
    height: 24,
  },
  speakerBody: {
    width: 10,
    height: 14,
    borderWidth: 2,
    borderRadius: 2,
    borderRightWidth: 0,
    backgroundColor: 'transparent',
  },
  speakerCone: {
    width: 6,
    height: 10,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    gap: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
});

interface AudioVolumeSliderProps {
  volume: number;
  onVolumeChange: (delta: number) => void;
}

/**
 * * * * Volume icon bar chunks ──────────────────────────────── */
const VolumeIcon: React.FC<{level: number; color: string}> = ({level, color}) => {
  const barCount = 3;
  const activeBars =
    level === 0 ? 0
    : level <= 33 ? 1
    : level <= 66 ? 2
    : 3;

  return (
    <View style={iconStyles.volIconRow}>
      {/* Speaker body */}
      <View style={[iconStyles.speakerBody, {borderColor: color}]} />
      <View style={[iconStyles.speakerCone, {backgroundColor: color}]} />

      {/* Sound wave bars */}
      {level > 0 && (
        <View style={iconStyles.waveRow}>
          {Array.from({length: barCount}).map((_, i) => (
            <View
              key={i}
              style={[
                iconStyles.waveBar,
                {
                  backgroundColor: i < activeBars ? color : 'transparent',
                  borderColor: color,
                  borderWidth: i >= activeBars ? 1 : 0,
                  height: 10 + i * 4,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Component ──────────────────────────────────────────────

export const AudioVolumeSlider: React.FC<AudioVolumeSliderProps> = ({
  volume,
  onVolumeChange,
}) => {
  const {colors} = useTheme();

  const trackWidthRef = useRef(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);
  const dragFractionRef = useRef(0);

  const thumbScale = useRef(new Animated.Value(1)).current;

  const volumeFraction = volume / 100;
  const displayFraction = isDragging ? dragFraction : volumeFraction;

  // Haptic at extremes
  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const RNHaptics = require('react-native-haptic-feedback');
        RNHaptics.default.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      } catch {}
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
          setDragFraction(frac);
          dragFractionRef.current = frac;
          setIsDragging(true);
          Animated.spring(thumbScale, {
            toValue: 1.3,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
        },

        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
          setDragFraction(frac);
          dragFractionRef.current = frac;
        },

        onPanResponderRelease: () => {
          const frac = dragFractionRef.current;
          setIsDragging(false);
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 100,
          }).start();

          // Convert fraction to delta from current volume
          const targetVol = Math.round(frac * 100);
          const currentVol = volume;
          const delta = targetVol - currentVol;
          onVolumeChange(delta);

          // Haptic at extremes
          if (targetVol === 0 || targetVol === 100) {
            triggerHaptic();
          }
        },

        onPanResponderTerminate: () => {
          setIsDragging(false);
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 100,
          }).start();
        },
      }),
    [onVolumeChange, volume, thumbScale, triggerHaptic],
  );

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          marginBottom: 16,
        },
        trackContainer: {
          flex: 1,
          height: 24,
          justifyContent: 'center',
          position: 'relative',
        },
        trackBg: {
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.text.tertiary,
        },
        trackFill: {
          position: 'absolute',
          left: 0,
          top: 10,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.accent.gold,
        },
        thumb: {
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: colors.accent.gold,
          top: 4,
          marginLeft: -8,
          // Shadow
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        pctLabel: {
          minWidth: 36,
          textAlign: 'right',
        },

      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {/* Volume icon */}
      <VolumeIcon level={displayFraction * 100} color={colors.text.primary} />

      {/* Slider track */}
      <View
        style={styles.trackContainer}
        onLayout={handleTrackLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={`Volume, ${Math.round(displayFraction * 100)} percent`}
        accessibilityValue={{min: 0, max: 100, now: Math.round(displayFraction * 100)}}
        {...panResponder.panHandlers}>
        {/* Background */}
        <View style={styles.trackBg} />

        {/* Fill */}
        <View style={[styles.trackFill, {width: `${displayFraction * 100}%`}]} />

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {left: `${displayFraction * 100}%`},
            {transform: [{scale: thumbScale}]},
          ]}
        />
      </View>

      {/* Percentage label */}
      <AppText variant="caption" color="secondary" style={styles.pctLabel}>
        {Math.round(displayFraction * 100)}%
      </AppText>
    </View>
  );
};

export default AudioVolumeSlider;
