import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
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

const MINI_PLAYER_HEIGHT = 72;
const ARTWORK_SIZE = 48;
const CONTROL_SIZE = 42;
const SWIPE_DISTANCE = 60;

interface MiniAudioPlayerProps {
  overTabBar?: boolean;
}

const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = () => {
  const {colors, spacing, radius, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    isVisible,
    isPlaying,
    currentTrack,
    currentPosition,
    duration,
    progress,
    sleepRemainingMs,
    sleepTimerActive,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleDismiss,
  } = useMiniPlayer();
  const {openPlayer} = usePlaybackCommands();
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : 1,
      duration: isVisible ? 260 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 12 || Math.abs(gesture.dx) > 12,
        onPanResponderRelease: (_, gesture) => {
          if (
            Math.abs(gesture.dy) > SWIPE_DISTANCE &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx)
          ) {
            handleDismiss();
          } else if (
            Math.abs(gesture.dx) > SWIPE_DISTANCE &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy)
          ) {
            gesture.dx < 0 ? handleNext() : handlePrevious();
          }
        },
      }),
    [handleDismiss, handleNext, handlePrevious],
  );

  const title = currentTrack?.title || 'No media playing';
  const subtitle = currentTrack?.artist || currentTrack?.album || 'Tap to open player';
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MINI_PLAYER_HEIGHT + insets.bottom + 20],
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: spacing.md,
          right: spacing.md,
          bottom: insets.bottom + 6,
          minHeight: MINI_PLAYER_HEIGHT,
          borderRadius: radius.lg,
          overflow: 'hidden',
          zIndex: 50,
          // surfaceDark is intended for media overlays; in light mode it makes
          // the primary text and dark transport icons disappear. The mini
          // player is an app surface, so use the theme-aware elevated token.
          backgroundColor: colors.background.elevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          ...shadows.md,
        },
        content: {
          minHeight: MINI_PLAYER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: spacing.sm,
          paddingRight: spacing.xs,
        },
        openArea: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
        },
        artwork: {
          width: ARTWORK_SIZE,
          height: ARTWORK_SIZE,
          borderRadius: radius.md,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.goldDim,
        },
        copy: {
          flex: 1,
          minWidth: 0,
          marginLeft: spacing.sm,
          marginRight: spacing.xs,
        },
        title: {
          color: colors.text.primary,
          fontSize: 14,
          lineHeight: 18,
          fontWeight: '600',
        },
        subtitle: {
          color: colors.text.secondary,
          fontSize: 12,
          lineHeight: 16,
          marginTop: 2,
        },
        controls: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        button: {
          width: CONTROL_SIZE,
          height: CONTROL_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: CONTROL_SIZE / 2,
        },
        playButton: {
          backgroundColor: colors.accent.gold,
        },
        closeButton: {
          marginLeft: 2,
        },
        sleepBadge: {
          position: 'absolute',
          top: 4,
          right: 8,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 8,
          backgroundColor: colors.accent.goldWash,
          zIndex: 2,
        },
      }),
    [colors, insets.bottom, radius, shadows, spacing],
  );

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.container, {transform: [{translateY}]}]}
      {...panResponder.panHandlers}>
      <MiniProgressBar progress={progress} />
      {sleepTimerActive && sleepRemainingMs > 0 && (
        <View style={styles.sleepBadge} pointerEvents="none">
          <AppText variant="caption" color="primary">
            {formatRemaining(sleepRemainingMs)}
          </AppText>
        </View>
      )}

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.openArea}
          activeOpacity={0.78}
          onPress={handleOpenPlayer}
          onLongPress={() => navigationRef.navigate('Queue', {from: 'mini'})}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel={`Open audio player: ${title}`}>
          <View style={styles.artwork}>
            {currentTrack?.artworkUri ? (
              <FastImage
                source={{uri: currentTrack.artworkUri}}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <SvgIcon name="music" size={22} color={colors.text.tertiary} />
            )}
            {isPlaying && (
              <View style={[StyleSheet.absoluteFill, artworkOverlayStyles]}>
                <AudioWaveform isPlaying color={colors.accent.gold} size={22} barWidth={2} barGap={2} />
              </View>
            )}
          </View>
          <View style={styles.copy}>
            <AppText variant="bodySmall" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
              {title}
            </AppText>
            <AppText variant="caption" numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.button}
            onPress={handlePrevious}
            accessibilityRole="button"
            accessibilityLabel="Previous track">
            <SvgIcon name="prevTrack" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.playButton]}
            onPress={handlePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <SvgIcon name={isPlaying ? 'pause' : 'play'} size={19} color={colors.text.inverse} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next track">
            <SvgIcon name="nextTrack" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close mini player"
            accessibilityHint="Pause and remove the mini player">
            <SvgIcon name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const artworkOverlayStyles = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: 'rgba(0,0,0,0.35)',
};

export default MiniAudioPlayer;
