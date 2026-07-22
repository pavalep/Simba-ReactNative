import React, {useRef, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  LayoutChangeEvent,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../core/AppText/AppText';
import {useAppSelector, useAppDispatch} from '../../store';
import {setPlaybackState, setPosition} from '../../store/slices/playerSlice';
import {MpvPlayer} from '../../native';
import {navigationRef} from '../../navigation/navigationHelper';
import {imagePaths} from '../../constants/imagePaths';

// ─── Constants ──────────────────────────────────────────────

const MINI_PLAYER_HEIGHT = 64;
const ARTWORK_SIZE = 44;
const TAB_BAR_HEIGHT = 68;
const TAB_BAR_BOTTOM_MARGIN = 12;
const MINI_PLAYER_BOTTOM_GAP = 4;
const SEEK_BAR_HEIGHT = 3;

// ─── Formatting ─────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────

export const MiniPlayer: React.FC = () => {
  const {colors, spacing, radius, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const {currentFile, playbackState, currentPosition, duration} =
    useAppSelector(state => state.player);

  const isActive =
    playbackState === 'playing' || playbackState === 'paused';
  const isPlaying = playbackState === 'playing';

  // ── Slide animation ──────────────────────────────────
  const slideAnim = useRef(new Animated.Value(isActive ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isActive ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isActive, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MINI_PLAYER_HEIGHT + 12],
  });

  const animOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // ── Seek bar ─────────────────────────────────────────
  const seekTrackRef = useRef<{width: number}>({width: 0});

  const handleSeekTrackLayout = useCallback((e: LayoutChangeEvent) => {
    seekTrackRef.current.width = e.nativeEvent.layout.width;
  }, []);

  const handleSeekTap = useCallback(
    (e: any) => {
      if (duration <= 0) return;
      const x = e.nativeEvent.locationX;
      const trackW = seekTrackRef.current.width;
      if (trackW <= 0) return;
      const pct = Math.max(0, Math.min(1, x / trackW));
      const newPos = pct * duration;
      dispatch(setPosition(newPos));
      try {
        MpvPlayer.seekTo(newPos);
      } catch {
        // native not available
      }
    },
    [duration, dispatch],
  );

  // ── Play/pause handler ───────────────────────────────
  const handlePlayPause = useCallback(() => {
    try {
      if (isPlaying) {
        MpvPlayer.pause();
        dispatch(setPlaybackState('paused'));
      } else {
        MpvPlayer.play();
        dispatch(setPlaybackState('playing'));
      }
    } catch {
      // native not available
    }
  }, [isPlaying, dispatch]);

  // ── Tap to expand ────────────────────────────────────
  const handleTap = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('MainTabs' as any, {
        screen: 'HomeTab',
        params: {screen: 'NowPlaying'},
      } as any);
    }
  }, []);

  // ── Derived values ───────────────────────────────────
  const positionPct =
    duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  const title = currentFile?.title || 'No media playing';
  const subtitle = currentFile
    ? `${isPlaying ? 'Now Playing' : 'Paused'} · ${formatTime(currentPosition)} / ${formatTime(duration)}`
    : '';

  // ── Styles ───────────────────────────────────────────
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom:
            TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + insets.bottom + MINI_PLAYER_BOTTOM_GAP,
          height: MINI_PLAYER_HEIGHT,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          overflow: 'hidden',
          zIndex: 50,
        },
        touchableArea: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingBottom: SEEK_BAR_HEIGHT,
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
          width: 22,
          height: 22,
          tintColor: colors.accent.gold,
        },
        textContainer: {
          flex: 1,
          marginLeft: spacing.md,
          marginRight: spacing.sm,
        },
        titleText: {
          color: colors.text.primary,
          fontSize: 15,
          fontWeight: '500',
        },
        subtitleText: {
          color: colors.text.secondary,
          fontSize: 12,
          marginTop: 2,
        },
        playButton: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
        },
        playIcon: {
          fontSize: 20,
          color: colors.accent.gold,
        },
        seekBarContainer: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SEEK_BAR_HEIGHT,
        },
        seekTrack: {
          flex: 1,
          backgroundColor: colors.border.subtle,
        },
        seekFill: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.accent.gold,
        },
      }),
    [
      colors,
      spacing,
      radius,
      insets.bottom,
    ],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.emphasis,
          shadowColor: '#000',
          ...shadows.md,
          transform: [{translateY}],
          opacity: animOpacity,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleTap}
        style={styles.touchableArea}>
        {/* Album art placeholder */}
        <View style={[styles.artwork, {backgroundColor: colors.accent.goldDim}]}>
          <Image
            source={imagePaths.uiMusicGray}
            style={styles.artworkIcon}
            resizeMode="contain"
          />
        </View>

        {/* Text info */}
        <View style={styles.textContainer}>
          <AppText variant="body2" numberOfLines={1} style={styles.titleText}>
            {title}
          </AppText>
          <AppText variant="caption" style={styles.subtitleText}>
            {subtitle}
          </AppText>
        </View>

        {/* Play/pause button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={styles.playButton}>
          <AppText style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</AppText>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Seek bar */}
      <View
        style={styles.seekBarContainer}
        onLayout={handleSeekTrackLayout}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleSeekTap}>
        <View style={styles.seekTrack} pointerEvents="none" />
        <View
          style={[styles.seekFill, {width: `${positionPct * 100}%`}]}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
};

export default MiniPlayer;
