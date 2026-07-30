import React, {useRef, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import AudioWaveform from '../AudioWaveform/AudioWaveform';
import {MiniProgressBar} from './MiniProgressBar';
import {useMiniPlayer} from './useMiniPlayer';
import {navigate} from '../../../navigation/navigationHelper';

// ─── Constants ──────────────────────────────────────────────

const MINI_PLAYER_HEIGHT = 56;
const ARTWORK_SIZE = 40;
const CONTROL_BUTTON_SIZE = 36;

// Tab bar constants must match FloatingTabBar
const TAB_BAR_HEIGHT = 60;
const TAB_BAR_BOTTOM_MARGIN = 10;
const MINI_PLAYER_GAP = 4;

// ─── Component ──────────────────────────────────────────────

export const MiniAudioPlayer: React.FC = () => {
  const {colors, spacing, radius, shadows} = useTheme();
  const insets = useSafeAreaInsets();

  const {isVisible, isPlaying, currentTrack, progress, handlePlayPause, handleNext, handlePrevious} =
    useMiniPlayer();

  // ── Slide animation ──────────────────────────────────
  const slideAnim = useRef(new Animated.Value(isVisible ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP + 12],
  });

  const animOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // ── Tap to open AudioPlayer ──────────────────────────
  const handleOpenPlayer = useCallback(() => {
    navigate('AudioPlayer');
  }, []);

  // ── Stop propagation on control buttons ────────────
  const handlePrevPress = useCallback(() => {
    handlePrevious();
  }, [handlePrevious]);

  const handleNextPress = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // ── Derived values ──────────────────────────────────
  const title = currentTrack?.title || '';
  const subtitle = currentTrack?.title || ''; // no separate artist field in PlaylistEntry

  // ── Styles ───────────────────────────────────────────
  const bottomPosition =
    TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + insets.bottom + MINI_PLAYER_GAP;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: bottomPosition,
          height: MINI_PLAYER_HEIGHT,
          borderRadius: radius.md,
          overflow: 'hidden',
          zIndex: 50,
        },
        touchableArea: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: spacing.sm,
          paddingRight: spacing.xs,
        },
        artwork: {
          width: ARTWORK_SIZE,
          height: ARTWORK_SIZE,
          borderRadius: ARTWORK_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        artworkIcon: {
          width: 20,
          height: 20,
        },
        textContainer: {
          flex: 1,
          marginLeft: spacing.md,
          marginRight: spacing.sm,
        },
        titleText: {
          color: colors.text.primary,
          fontSize: 14,
          fontWeight: '500',
          lineHeight: 18,
        },
        subtitleText: {
          color: colors.text.secondary,
          fontSize: 12,
          lineHeight: 16,
          marginTop: 1,
        },
        controls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        },
        controlButton: {
          width: CONTROL_BUTTON_SIZE,
          height: CONTROL_BUTTON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: CONTROL_BUTTON_SIZE / 2,
        },
        playButton: {
          width: CONTROL_BUTTON_SIZE,
          height: CONTROL_BUTTON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: CONTROL_BUTTON_SIZE / 2,
          backgroundColor: colors.accent.goldDim,
        },
      }),
    [colors, spacing, radius, bottomPosition],
  );

  if (!isVisible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(18,18,20,0.96)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          ...shadows.md,
          transform: [{translateY}],
          opacity: animOpacity,
        },
      ]}>
      {/* Gold progress bar at the very top */}
      <MiniProgressBar progress={progress} />

      {/* Tappable area — opens the audio player */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpenPlayer}
        style={styles.touchableArea}
        accessibilityRole="button"
        accessibilityLabel={`Open audio player: ${title}`}>
        {/* Album artwork with waveform overlay when playing */}
        <View style={styles.artwork}>
          {currentTrack?.uri ? (
            <FastImage
              source={{
                uri: currentTrack.uri,
                priority: FastImage.priority.high,
                cache: FastImage.cacheControl.immutable,
              }}
              style={StyleSheet.absoluteFill}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.accent.goldDim, alignItems: 'center', justifyContent: 'center'}]}>
              <SvgIcon
                name="music"
                size={22}
                color={colors.text.tertiary}
                style={styles.artworkIcon}
              />
            </View>
          )}
          {isPlaying && (
            <View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)'}]}>
              <AudioWaveform isPlaying={true} color="#C9A84C" size={20} barWidth={2} barGap={2} />
            </View>
          )}
        </View>

        {/* Title & artist */}
        <View style={styles.textContainer}>
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.titleText}>
            {title || 'No media playing'}
          </AppText>
          <AppText
            variant="caption"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.subtitleText}>
            {subtitle || 'Tap to open player'}
          </AppText>
        </View>

        {/* Transport controls */}
        <View style={styles.controls}>
          {/* Previous */}
          <TouchableOpacity
            onPress={handlePrevPress}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Previous track">
            <SvgIcon name="skipBack" size={18} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            onPress={handlePlayPause}
            hitSlop={{top: 8, bottom: 8, left: 6, right: 6}}
            style={styles.playButton}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <SvgIcon
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color={colors.accent.gold}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={handleNextPress}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Next track">
            <SvgIcon name="skipForward" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default MiniAudioPlayer;
