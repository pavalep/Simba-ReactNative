import React, {useRef, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import AudioWaveform from '../AudioWaveform/AudioWaveform';
import {MiniProgressBar} from './MiniProgressBar';
import {useMiniPlayer} from './useMiniPlayer';
import {usePlaybackCommands} from '../../../modules/playback/PlaybackContext';
import {navigationRef} from '../../../navigation/navigationHelper';

// ─── Constants ──────────────────────────────────────────────

const MINI_PLAYER_HEIGHT = 64;
const ARTWORK_SIZE = 40;
// WCAG 2.1 AA minimum touch target: 44×44 (was 36×36 — audit 32.1)
const CONTROL_BUTTON_SIZE = 44;

// v11 Wave 1: the authenticated shell no longer reserves space for a
// persistent bottom tab bar. Keep a small separation from the safe-area edge.
const MINI_PLAYER_GAP = 4;

// Swipe gesture thresholds (32.4)
const SWIPE_DISTANCE = 60;

const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── Component ──────────────────────────────────────────────

interface MiniAudioPlayerProps {
  /**
   * Legacy compatibility prop. The v11 shell has no persistent bottom tab
   * bar, so this remains false by default and should not be used by new code.
   */
  overTabBar?: boolean;
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = () => {
  const {colors, spacing, radius, shadows} = useTheme();
  const insets = useSafeAreaInsets();

  const {isVisible, isPlaying, currentTrack, currentPosition, duration, progress, sleepRemainingMs, sleepTimerActive, handlePlayPause, handleNext, handlePrevious, handleDismiss} =
    useMiniPlayer();
  const {openPlayer} = usePlaybackCommands();

  // ── Slide animation ──────────────────────────────────
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Start from hidden position, then slide up
      slideAnim.setValue(1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP + 12],
  });

  const animOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // ── Tap to expand the root playback overlay ──────────
  const handleOpenPlayer = useCallback(() => {
    if (!currentTrack) return;
    openPlayer({
      uri: currentTrack.uri,
      title: currentTrack.title,
      duration: currentTrack.duration ?? duration,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artworkUri: currentTrack.artworkUri,
      source: currentTrack.source,
      type: currentTrack.type,
      mediaType: currentTrack.mediaType,
      provider: currentTrack.provider,
      folderId: currentTrack.folderId,
      startPosition: currentPosition,
    });
  }, [currentPosition, currentTrack, duration, openPlayer]);

  // ── Stop propagation on control buttons ────────────
  const handlePrevPress = useCallback(() => {
    handlePrevious();
  }, [handlePrevious]);

  const handleNextPress = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const handleClosePress = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  // ── Swipe gestures: down = dismiss, left/right = next/prev (32.4) ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 12 || Math.abs(g.dx) > 12,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dy) > SWIPE_DISTANCE && Math.abs(g.dy) > Math.abs(g.dx)) {
            handleDismiss();
          } else if (
            Math.abs(g.dx) > SWIPE_DISTANCE &&
            Math.abs(g.dx) > Math.abs(g.dy)
          ) {
            if (g.dx < 0) {
              handleNext();
            } else {
              handlePrevious();
            }
          }
        },
      }),
    [handleDismiss, handleNext, handlePrevious],
  );

  // ── Derived values ──────────────────────────────────
  const title = currentTrack?.title || '';
  const subtitle = currentTrack?.title || ''; // no separate artist field in PlaylistEntry

  // ── Styles ───────────────────────────────────────────
  // v11 Wave 1: the player rests directly above the safe-area inset. The
  // legacy prop is intentionally ignored so no screen can reintroduce the
  // retired tab-bar offset by accident.
  const bottomPosition = insets.bottom + MINI_PLAYER_GAP;

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
        sleepBadge: {
          position: 'absolute',
          top: 2,
          right: spacing.sm,
          paddingHorizontal: 8,
          paddingVertical: 1,
          borderRadius: 8,
          backgroundColor: colors.accent.goldWash,
          zIndex: 10,
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
          backgroundColor: colors.background.surfaceDark,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          ...shadows.md,
          transform: [{translateY}],
          opacity: animOpacity,
        },
      ]}
      {...panResponder.panHandlers}>
        {/* Gold progress bar at the very top */}
      <MiniProgressBar progress={progress} />

      {/* Sleep timer badge (32.2) */}
      {sleepTimerActive && sleepRemainingMs > 0 && (
        <View style={styles.sleepBadge}>
          <AppText variant="caption" color="primary">
            Sleep {formatRemaining(sleepRemainingMs)}
          </AppText>
        </View>
      )}

      {/* Tappable area — opens the audio player; long-press opens the full queue (48.6) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpenPlayer}
        onLongPress={() => navigationRef.navigate('Queue', {from: 'mini'})}
        delayLongPress={450}
        style={styles.touchableArea}
        accessibilityRole="button"
        accessibilityLabel={`Open audio player: ${title}`}
        accessibilityHint="Long press to open the full queue">
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
            <View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.scrim}]}>
              <AudioWaveform isPlaying={true} color={colors.accent.gold} size={20} barWidth={2} barGap={2} />
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
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
            accessibilityHint="Swipe right on the mini player for the same action">
            <SvgIcon name="skipBack" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <SvgIcon
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={colors.accent.gold}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={handleNextPress}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Next track"
            accessibilityHint="Swipe left on the mini player for the same action">
            <SvgIcon name="skipForward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Explicit dismiss action; swipe-down remains available as a gesture. */}
          <TouchableOpacity
            onPress={handleClosePress}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Close mini player"
            accessibilityHint="Pauses playback and dismisses the mini player">
            <SvgIcon name="close" size={19} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default MiniAudioPlayer;
