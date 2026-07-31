import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import SeekBar from '../../../components/player/SeekBar/SeekBar';

// ─── Props ─────────────────────────────────────────────────

export interface PrimaryControlsProps {
  visible?: boolean;
  position: number;
  duration: number;
  isPlaying: boolean;
  chapters: Array<{startTime: number; title?: string}>;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRewind: () => void;
  onForward: () => void;
  onSeek: (pct: number) => void;
  bottomInset: number;
  /** 46.1: accessibility scale for control sizes (1 = default, >1 = larger) */
  controlScale?: number;
}

// ─── Component ──────────────────────────────────────────────

export const PrimaryControls: React.FC<PrimaryControlsProps> = ({
  visible = true,
  position,
  duration,
  isPlaying,
  chapters,
  onPlayPause,
  onPrev,
  onNext,
  onRewind,
  onForward,
  onSeek,
  bottomInset,
  controlScale = 1,
}) => {
  const {colors} = useTheme();
  const iconColor = '#EDEDED';
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const playScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: visible ? 0 : 18, duration: 220, useNativeDriver: true}),
    ]).start();
  }, [opacity, translateY, visible]);

  const handlePlayPressIn = React.useCallback(() => {
    Animated.spring(playScale, {
      toValue: 0.85,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [playScale]);

  const handlePlayPressOut = React.useCallback(() => {
    Animated.spring(playScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 100,
    }).start();
  }, [playScale]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          paddingBottom: bottomInset + 8,
          paddingTop: 8,
          backgroundColor: 'rgba(8, 8, 10, 0.72)',
        },
        seekBarWrapper: {
          marginBottom: 2,
        },
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          paddingHorizontal: 24,
          paddingVertical: 4,
        },
        transportBtn: {
          width: 56 * controlScale,
          height: 56 * controlScale,
          borderRadius: 28 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        playBtn: {
          width: 64 * controlScale,
          height: 64 * controlScale,
          borderRadius: 32 * controlScale,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors, bottomInset, controlScale],
  );

  return (
    <Animated.View
      style={[styles.container, {opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* Seek bar */}
      <View style={styles.seekBarWrapper}>
        <SeekBar
          position={position}
          duration={duration}
          chapters={chapters}
          onSeek={onSeek}
        />
      </View>

      {/* Transport controls */}
      <View style={styles.transportRow}>
        {/* Previous */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipBack" size={22} color={iconColor} />
        </TouchableOpacity>

        {/* -10s rewind */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onRewind}
          accessibilityRole="button"
          accessibilityLabel="Rewind 10 seconds"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipBack" size={22} color={iconColor} />
        </TouchableOpacity>

        {/* Play / Pause */}
        <Animated.View style={{transform: [{scale: playScale}]}}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={onPlayPause}
            onPressIn={handlePlayPressIn}
            onPressOut={handlePlayPressOut}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SvgIcon
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={colors.text.inverse}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* +10s forward */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onForward}
          accessibilityRole="button"
          accessibilityLabel="Forward 10 seconds"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipForward" size={22} color={iconColor} />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipForward" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default PrimaryControls;
