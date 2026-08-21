import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../../theme';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import SeekBar from '../../../../components/player/SeekBar/SeekBar';
import {AppText} from '../../../../components/core/AppText/AppText';

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
  /**
   * YouTube-class buffered ranges — list of `{start, end}` in seconds.
   * Each range renders as a separate grey segment on the seek bar.
   * Takes priority over `bufferedFraction` when both are provided.
   */
  bufferedRanges?: Array<{start: number; end: number}>;
  /**
   * Whether the stream is seekable. False for live streams and
   * unknown-length sources. The seek bar dims and the scrub thumb is
   * hidden when false so the user can see seeking isn't possible.
   */
  seekable?: boolean;
  controlScale?: number;
  SecondaryToolbar?: React.ReactNode;
  /** V6 5.3.1: when false, prev/next track buttons are hidden. */
  hasMultipleTracks?: boolean;
  /** V6 9.3.3: optional thumbnail URI for scrub preview bubble. */
  scrubThumbnailUri?: string;
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
  bufferedRanges,
  seekable = true,
  controlScale = 1,
  SecondaryToolbar,
  hasMultipleTracks = true,
  scrubThumbnailUri,
}) => {
  const {colors} = useTheme();

  // Master fade + lift
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  // Staggered inner animations: seek bar fades in first, then transport
  const seekOpacity = useRef(new Animated.Value(1)).current;
  const transportOpacity = useRef(new Animated.Value(1)).current;
  const transportTranslateY = useRef(new Animated.Value(0)).current;
  // Play button pulse
  const playScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Entrance: seek bar first, then transport
      Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: 220, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 0, duration: 220, useNativeDriver: true}),
        Animated.sequence([
          Animated.timing(seekOpacity, {toValue: 1, duration: 180, useNativeDriver: true}),
          Animated.timing(transportOpacity, {toValue: 1, duration: 200, useNativeDriver: true}),
          Animated.timing(transportTranslateY, {toValue: 0, duration: 200, useNativeDriver: true}),
        ]),
      ]).start();
    } else {
      // Exit: transport leaves first, then seek bar
      Animated.parallel([
        Animated.timing(opacity, {toValue: 0, duration: 180, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 24, duration: 180, useNativeDriver: true}),
        Animated.sequence([
          Animated.timing(transportTranslateY, {toValue: 12, duration: 140, useNativeDriver: true}),
          Animated.timing(transportOpacity, {toValue: 0, duration: 140, useNativeDriver: true}),
          Animated.timing(seekOpacity, {toValue: 0, duration: 140, useNativeDriver: true}),
        ]),
      ]).start();
    }
  }, [visible, opacity, translateY, seekOpacity, transportOpacity, transportTranslateY]);

  const handlePlayPressIn = React.useCallback(() => {
    Animated.spring(playScale, {
      toValue: 0.88,
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
  const seekControlsEnabled = seekable && duration > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // The bottom panel is just a stacking surface; the actual visual
        // background is the gradient wrapper below. The V2 wrapper handles
        // absolute positioning; this is a normal flex child that flows
        // from the top of the panel downward.
        container: {
          paddingBottom: bottomInset,
        },
        secondaryWrapper: {
          marginBottom: 10,
          paddingHorizontal: 14,
        },
        // Seek row: lives just above the transport, breathes with padding
        seekRow: {
          opacity: 1,
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
        },
        // Transport row
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 18,
        },
        // Skip chips (-10s / +10s): tight glass pills
        skipChip: {
          width: 56 * controlScale,
          height: 48 * controlScale,
          borderRadius: 20 * controlScale,
          backgroundColor: colors.background.highlight,
          borderWidth: 0.5,
          borderColor: colors.border.emphasis,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Track-skip outer buttons (prev/next file): outline only
        trackBtn: {
          width: 48 * controlScale,
          height: 48 * controlScale,
          borderRadius: 24 * controlScale,
          backgroundColor: 'transparent',
          borderWidth: 0.5,
          borderColor: colors.background.highlightStrong,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Play button: gold disc with gradient (handled in JSX via LinearGradient)
        playBtnWrap: {
          width: 72 * controlScale,
          height: 72 * controlScale,
          borderRadius: 36 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
          // soft outer glow
          shadowColor: colors.accent.gold,
          shadowOffset: {width: 0, height: 0},
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 10,
        },
        disabledControl: {
          opacity: 0.42,
        },
        playBtnInner: {
          width: 72 * controlScale,
          height: 72 * controlScale,
          borderRadius: 36 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border.emphasis,
        },
      }),
    [colors, bottomInset, controlScale],
  );

  return (
    <Animated.View
      style={[styles.container, {opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* Gradient backdrop: transparent at the top edge of the panel,
          fading down to near-opaque at the bottom. This replaces the
          flat dark slab and creates a cinematic dissolve. */}
      <LinearGradient
        colors={[colors.background.scrimFaint, colors.background.scrimDim, colors.background.scrimStrong]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 1. Secondary toolbar (icon-only, hosts chapter/audio/eq/loop/etc.) */}
      {SecondaryToolbar && (
        <View style={styles.secondaryWrapper}>{SecondaryToolbar}</View>
      )}

      {/* 2. Seek bar */}
      <Animated.View style={[styles.seekRow, {opacity: seekOpacity}]}>
        <SeekBar
          position={position}
          duration={duration}
          chapters={chapters}
          onSeek={onSeek}
          seekable={seekable}
          bufferedFraction={bufferedFraction}
          bufferedRanges={bufferedRanges}
          trackHeight={22}
          thumbnailUri={scrubThumbnailUri}
        />
      </Animated.View>

      {/* 3. Transport row — V6 5.1.1: industry-standard order.
            Single video (no playlist): [-10s] [Play] [+10s]
            Playlist:                       [Prev] [-10s] [Play] [+10s] [Next]
            Skip-10s and Prev/Next use visually distinct icons (5.2.x). */}
      <Animated.View
        style={[
          styles.transportRow,
          {opacity: transportOpacity, transform: [{translateY: transportTranslateY}]},
        ]}>
        {/* -10s Rewind (V6 5.2.1: now uses rewind10s icon, distinct from prev-track) */}
        <TouchableOpacity
          style={[styles.skipChip, !seekControlsEnabled && styles.disabledControl]}
          onPress={handleRewind}
          disabled={!seekControlsEnabled}
          accessibilityRole="button"
          accessibilityLabel="Rewind 10 seconds"
          accessibilityState={{disabled: !seekControlsEnabled}}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="rewind10" size={18} color={colors.text.bright} />
        </TouchableOpacity>

        {/* V6 5.3.2: prev track only when there is a playlist */}
        {hasMultipleTracks && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={onPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
            accessibilityHint="Play the previous item in this video queue"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SvgIcon name="prevTrack" size={20} color={colors.text.bright} />
          </TouchableOpacity>
        )}

        {/* Play / Pause — gold gradient disc with soft outer glow */}
        <Animated.View style={[styles.playBtnWrap, {transform: [{scale: playScale}]}]}>
          <LinearGradient
            colors={[colors.accent.gold, colors.background.warm]}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={styles.playBtnInner}>
            <TouchableOpacity
              style={{width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center'}}
              onPress={onPlayPause}
              onPressIn={handlePlayPressIn}
              onPressOut={handlePlayPressOut}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              accessibilityHint={isPlaying ? 'Pause the current video' : 'Resume the current video'}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <SvgIcon
                name={isPlaying ? 'pause' : 'play'}
                size={30}
                color={colors.text.inverse}
              />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* V6 5.3.2: next track only when there is a playlist */}
        {hasMultipleTracks && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel="Next track"
            accessibilityHint="Play the next item in this video queue"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SvgIcon name="nextTrack" size={20} color={colors.text.bright} />
          </TouchableOpacity>
        )}

        {/* +10s Forward (V6 5.2.1: now uses forward10s icon) */}
        <TouchableOpacity
          style={[styles.skipChip, !seekControlsEnabled && styles.disabledControl]}
          onPress={handleForward}
          disabled={!seekControlsEnabled}
          accessibilityRole="button"
          accessibilityLabel="Forward 10 seconds"
          accessibilityState={{disabled: !seekControlsEnabled}}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="forward10" size={18} color={colors.text.bright} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// V6 8.1.2: wrap in React.memo so the transport row does not re-render on
// every position tick (TransportContext updates ~4Hz during playback). The
// component takes 15+ props; without memo each tick forces a re-render even
// when nothing actually changed.
export default React.memo(PrimaryControls);
