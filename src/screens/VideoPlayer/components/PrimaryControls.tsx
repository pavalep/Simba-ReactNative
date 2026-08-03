import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import SeekBar from '../../../components/player/SeekBar/SeekBar';
import {AppText} from '../../../components/core/AppText/AppText';

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
  onRewind?: () => void;
  onForward?: () => void;
  onSeek: (pct: number) => void;
  bottomInset: number;
  bufferedFraction?: number;
  controlScale?: number;
  SecondaryToolbar?: React.ReactNode;
}

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
  bufferedFraction = 0,
  controlScale = 1,
  SecondaryToolbar,
}) => {
  const {colors} = useTheme();
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

  const defaultRewind = React.useCallback(() => {
    onSeek(Math.max(0, (position - 10) / (duration || 1)));
  }, [onSeek, position, duration]);

  const defaultForward = React.useCallback(() => {
    onSeek(Math.min(1, (position + 10) / (duration || 1)));
  }, [onSeek, position, duration]);

  const handleRewind = onRewind ?? defaultRewind;
  const handleForward = onForward ?? defaultForward;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          paddingBottom: bottomInset + 12,
          paddingTop: 10,
          backgroundColor: 'rgba(0,0,0,0.88)',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        secondaryWrapper: {
          marginBottom: 16,
        },
        seekBarWrapper: {
          marginVertical: 8,
          paddingHorizontal: 16,
        },
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
        },
        transportBtn: {
          width: 48 * controlScale,
          height: 48 * controlScale,
          borderRadius: 24 * controlScale,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        seekBadgeBtn: {
          width: 52 * controlScale,
          height: 52 * controlScale,
          borderRadius: 26 * controlScale,
          backgroundColor: 'rgba(255,255,255,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 2,
        },
        seekBadgeText: {
          fontSize: 12,
          fontWeight: '800',
          color: '#FFFFFF',
          letterSpacing: -0.5,
        },
        playBtn: {
          width: 64 * controlScale,
          height: 64 * controlScale,
          borderRadius: 32 * controlScale,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.accent.gold,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        },
      }),
    [colors, bottomInset, controlScale],
  );

  return (
    <Animated.View
      style={[styles.container, {opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* 1. Embedded Secondary Toolbar */}
      {SecondaryToolbar && (
        <View style={styles.secondaryWrapper}>
          {SecondaryToolbar}
        </View>
      )}

      {/* 2. Embedded Seek bar */}
      <View style={styles.seekBarWrapper}>
        <SeekBar
          position={position}
          duration={duration}
          chapters={chapters}
          onSeek={onSeek}
          bufferedFraction={bufferedFraction}
        />
      </View>

      {/* 3. Embedded Transport controls */}
      <View style={styles.transportRow}>
        {/* Previous Track */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipBack" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* -10s Rewind */}
        <TouchableOpacity
          style={styles.seekBadgeBtn}
          onPress={handleRewind}
          accessibilityRole="button"
          accessibilityLabel="Rewind 10 seconds"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipBack" size={14} color="#FFFFFF" />
          <AppText style={styles.seekBadgeText}>10</AppText>
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
              size={28}
              color={colors.text.inverse}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* +10s Forward */}
        <TouchableOpacity
          style={styles.seekBadgeBtn}
          onPress={handleForward}
          accessibilityRole="button"
          accessibilityLabel="Forward 10 seconds"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <AppText style={styles.seekBadgeText}>10</AppText>
          <SvgIcon name="skipForward" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Next Track */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipForward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default PrimaryControls;
