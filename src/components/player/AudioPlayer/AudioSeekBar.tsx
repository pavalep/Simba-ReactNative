import React, {useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  PanResponder,
  Animated,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';

// ─── Helpers ────────────────────────────────────────────────

function fmt(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return 'Live';
  return fmt(seconds);
}

// ─── Props ──────────────────────────────────────────────────

export interface AudioSeekBarProps {
  position: number;
  duration: number;
  onSeek: (fraction: number) => void;
  chapters?: Array<{startTime: number; title?: string}>;
}

const THUMB_SIZE_NORMAL = 16;
const THUMB_SIZE_DRAG = 20;
const TRACK_HEIGHT_THIN = 2;
const TRACK_HEIGHT_THICK = 4;

// ─── Component ──────────────────────────────────────────────

export const AudioSeekBar: React.FC<AudioSeekBarProps> = ({
  position: rawPosition,
  duration,
  onSeek,
  chapters,
}) => {
  const {colors} = useTheme();

  const trackWidthRef = useRef(1);

  // Scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  const scrubFractionRef = useRef(0);
  const panAnim = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const [showRemaining, setShowRemaining] = useState(false);

  // Track thickness animation
  const trackHeightAnim = useRef(new Animated.Value(TRACK_HEIGHT_THIN)).current;

  const durationSec = duration || 1;
  const positionFrac = duration > 0 ? Math.min(rawPosition / duration, 1) : 0;
  const displayFraction = isScrubbing ? scrubFraction : positionFrac;

  // ── Time labels ──
  const currentTime = isScrubbing ? scrubFraction * durationSec : rawPosition;
  const rightLabel = showRemaining
    ? `-${fmt(Math.max(0, durationSec - currentTime))}`
    : fmtDuration(durationSec);

  // ── PanResponder ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
          setScrubFraction(frac);
          scrubFractionRef.current = frac;
          panAnim.setValue(frac);
          setIsScrubbing(true);

          // Thicken track on touch
          Animated.timing(trackHeightAnim, {
            toValue: TRACK_HEIGHT_THICK,
            duration: 150,
            useNativeDriver: false,
          }).start();

          // Enlarge thumb on touch
          Animated.spring(thumbScale, {
            toValue: THUMB_SIZE_DRAG / THUMB_SIZE_NORMAL,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
        },

        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
          setScrubFraction(frac);
          scrubFractionRef.current = frac;
          panAnim.setValue(frac);
        },

        onPanResponderRelease: () => {
          setIsScrubbing(false);

          // Thin track on release
          Animated.timing(trackHeightAnim, {
            toValue: TRACK_HEIGHT_THIN,
            duration: 200,
            useNativeDriver: false,
          }).start();

          // Shrink thumb on release
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 100,
          }).start();

          onSeek(scrubFractionRef.current);
        },

        onPanResponderTerminate: () => {
          setIsScrubbing(false);

          Animated.timing(trackHeightAnim, {
            toValue: TRACK_HEIGHT_THIN,
            duration: 200,
            useNativeDriver: false,
          }).start();

          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 100,
          }).start();
        },
      }),
    [onSeek, panAnim, trackHeightAnim, thumbScale],
  );

  // ── Track layout ──
  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  // ── Chapter marks ──
  const chapterMarks = useMemo(() => {
    if (!chapters || chapters.length === 0 || duration <= 0) return null;
    return chapters.map((ch, i) => {
      const pct = (ch.startTime / duration) * 100;
      return (
        <TouchableOpacity
          key={i}
          activeOpacity={0.6}
          onPress={() => onSeek(ch.startTime / durationSec)}
          style={[
            styles.chapterMarkTouch,
            {left: `${pct}%`},
          ]}>
          <View style={[styles.chapterDot, {backgroundColor: colors.accent.gold}]} />
        </TouchableOpacity>
      );
    });
  }, [chapters, duration, durationSec, onSeek, colors.accent.gold]);

  // ── Styles ──
  const dynamicStyles = useMemo(
    () => ({
      trackContainer: {
        flex: 1,
        height: THUMB_SIZE_DRAG + 8,
        justifyContent: 'center' as const,
        position: 'relative' as const,
      },
      trackBg: {
        height: TRACK_HEIGHT_THIN,
        borderRadius: TRACK_HEIGHT_THIN / 2,
        backgroundColor: colors.text.tertiary,
      },
      trackBgAnimated: {
        borderRadius: TRACK_HEIGHT_THIN / 2,
        backgroundColor: colors.text.tertiary,
      },
      trackFill: {
        position: 'absolute' as const,
        left: 0,
        top: (THUMB_SIZE_DRAG + 8) / 2 - TRACK_HEIGHT_THIN / 2,
        height: TRACK_HEIGHT_THIN,
        borderRadius: TRACK_HEIGHT_THIN / 2,
        backgroundColor: colors.accent.gold,
      },
      trackFillAnimated: {
        borderRadius: TRACK_HEIGHT_THIN / 2,
        backgroundColor: colors.accent.gold,
      },
      thumb: {
        position: 'absolute' as const,
        width: THUMB_SIZE_NORMAL,
        height: THUMB_SIZE_NORMAL,
        borderRadius: THUMB_SIZE_NORMAL / 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: colors.accent.gold,
        top: (THUMB_SIZE_DRAG + 8) / 2 - THUMB_SIZE_NORMAL / 2,
        marginLeft: -THUMB_SIZE_NORMAL / 2,
        // Shadow
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {/* Left time label */}
      <AppText variant="caption" color="primary" style={styles.timeLabel}>
        {fmt(currentTime)}
      </AppText>

      {/* Seek track */}
      <View
        style={dynamicStyles.trackContainer}
        onLayout={handleTrackLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={`Playback seek bar, ${Math.round(displayFraction * 100)} percent`}
        accessibilityValue={{min: 0, max: 100, now: Math.round(displayFraction * 100)}}
        {...panResponder.panHandlers}>
        {/* Animated background track */}
        <Animated.View
          style={[
            styles.trackBgAbs,
            {backgroundColor: colors.text.tertiary},
            {height: trackHeightAnim, borderRadius: trackHeightAnim.interpolate({
              inputRange: [TRACK_HEIGHT_THIN, TRACK_HEIGHT_THICK],
              outputRange: [TRACK_HEIGHT_THIN / 2, TRACK_HEIGHT_THICK / 2],
            })},
          ]}
        />

        {/* Animated fill */}
        <Animated.View
          style={[
            styles.trackFillAbs,
            {backgroundColor: colors.accent.gold},
            {width: `${displayFraction * 100}%`},
            {height: trackHeightAnim, borderRadius: trackHeightAnim.interpolate({
              inputRange: [TRACK_HEIGHT_THIN, TRACK_HEIGHT_THICK],
              outputRange: [TRACK_HEIGHT_THIN / 2, TRACK_HEIGHT_THICK / 2],
            })},
          ]}
        />

        {/* Chapter dot marks */}
        {chapterMarks}

        {/* Position label above thumb (SoundCloud style) — shown only while dragging */}
        {isScrubbing && (
          <View
            style={[
              styles.positionLabel,
              {left: `${displayFraction * 100}%`, marginLeft: -30},
            ]}>
            <View style={[styles.positionLabelBg, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
              <AppText variant="caption" color="primary" style={styles.positionLabelText}>
                {fmt(scrubFraction * durationSec)}
              </AppText>
            </View>
          </View>
        )}

        {/* Thumb */}
        {displayFraction > 0 && (
          <Animated.View
            style={[
              styles.thumbAbs,
              {
                backgroundColor: '#FFFFFF',
                borderColor: colors.accent.gold,
                width: THUMB_SIZE_NORMAL,
                height: THUMB_SIZE_NORMAL,
                borderRadius: THUMB_SIZE_NORMAL / 2,
                marginLeft: -THUMB_SIZE_NORMAL / 2,
              },
              {left: `${displayFraction * 100}%`},
              {transform: [{scale: thumbScale}]},
            ]}
          />
        )}

        {/* Thumb at 0 position — always show a small indicator */}
        {displayFraction <= 0 && (
          <View
            style={[
              styles.thumbZero,
              {backgroundColor: '#FFFFFF', borderColor: colors.accent.gold},
            ]}
          />
        )}
      </View>

      {/* Right time label — tap to toggle remaining */}
      <TouchableOpacity
        onPress={() => setShowRemaining(prev => !prev)}
        activeOpacity={0.6}
        style={styles.timeLabelTouch}
        accessibilityLabel={showRemaining ? 'Show total duration' : 'Show remaining time'}>
        <AppText variant="caption" color="primary" style={styles.timeLabel}>
          {rightLabel}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

// ── Static styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    position: 'relative',
  },
  timeLabel: {
    minWidth: 40,
    textAlign: 'center',
  },
  timeLabelTouch: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  trackBgAbs: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (THUMB_SIZE_DRAG + 8) / 2 - TRACK_HEIGHT_THIN / 2,
  },
  trackFillAbs: {
    position: 'absolute',
    left: 0,
    top: (THUMB_SIZE_DRAG + 8) / 2 - TRACK_HEIGHT_THIN / 2,
  },
  thumbAbs: {
    position: 'absolute',
    top: (THUMB_SIZE_DRAG + 8) / 2 - THUMB_SIZE_NORMAL / 2,
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  thumbZero: {
    position: 'absolute',
    left: 0,
    top: (THUMB_SIZE_DRAG + 8) / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    marginLeft: -4,
  },
  chapterMarkTouch: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    top: (THUMB_SIZE_DRAG + 8) / 2 - 10,
    zIndex: 5,
  },
  chapterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  positionLabel: {
    position: 'absolute',
    bottom: THUMB_SIZE_DRAG + 12,
    zIndex: 20,
    alignItems: 'center',
    width: 60,
  },
  positionLabelBg: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  positionLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default React.memo(AudioSeekBar);
