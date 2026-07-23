import React, {useRef, useState, useCallback, useMemo} from 'react';
import {View, PanResponder, Animated, StyleSheet, LayoutChangeEvent} from 'react-native';
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

// ─── Props ──────────────────────────────────────────────────

export interface SeekBarProps {
  /** Current playback position in seconds */
  position: number;
  /** Total duration in seconds */
  duration: number;
  /** Called when user seeks to a fraction [0..1] */
  onSeek: (fraction: number) => void;
  /** Optional chapter marks */
  chapters?: Array<{startTime: number; title?: string}>;
  /** Height of the seek track (default: 16) */
  trackHeight?: number;
}

// ─── Component ──────────────────────────────────────────────

const SeekBar: React.FC<SeekBarProps> = ({
  position,
  duration,
  onSeek,
  chapters,
  trackHeight = 16,
}) => {
  const {colors} = useTheme();

  // Track layout
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);

  // Scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  const panAnim = useRef(new Animated.Value(0)).current;

  const durationSec = duration || 1;
  const positionFrac = duration > 0 ? Math.min(position / duration, 1) : 0;
  const displayFraction = isScrubbing ? scrubFraction : positionFrac;

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
          panAnim.setValue(frac);
          setIsScrubbing(true);
        },

        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const frac = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
          setScrubFraction(frac);
          panAnim.setValue(frac);
        },

        onPanResponderRelease: () => {
          setIsScrubbing(false);
          onSeek(scrubFraction);
        },

        onPanResponderTerminate: () => {
          setIsScrubbing(false);
        },
      }),
    [onSeek, scrubFraction, panAnim],
  );

  // ── Track layout callback ──
  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  // ── Styles ──
  // NOTE: styles MUST be declared before chapterMarks so that the
  // chapterMarks useMemo closure captures the correct style object.
  // After Babel transpilation, const becomes hoisted var (undefined),
  // so accessing styles.chapterMark before styles is assigned would crash.
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 6,
        },
        trackContainer: {
          flex: 1,
          height: trackHeight,
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
          top: trackHeight / 2 - 2,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.accent.gold,
        },
        thumb: {
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: colors.accent.gold,
          borderWidth: 1.5,
          borderColor: colors.accent.gold,
          top: trackHeight / 2 - 7,
          marginLeft: -7,
        },
        chapterMark: {
          position: 'absolute',
          width: 3,
          height: 12,
          backgroundColor: colors.text.primary,
          opacity: 0.5,
          borderRadius: 1,
        },
        timeLabel: {
          minWidth: 40,
          textAlign: 'center',
        },
        previewBubble: {
          backgroundColor: colors.background.elevated,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          borderWidth: 0.5,
          borderColor: colors.border.subtle,
          alignSelf: 'flex-start',
        },
        previewBubbleWrapper: {
          position: 'absolute',
          alignItems: 'center',
          width: 0,
          overflow: 'visible',
        },
        previewText: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.accent.gold,
        },
      }),
    [colors, trackHeight],
  );

  return (
    <View style={styles.container}>
      <AppText variant="caption" color="primary" style={styles.timeLabel}>
        {fmt(isScrubbing ? scrubFraction * durationSec : position)}
      </AppText>

      <View
        ref={(ref) => {
          if (ref) {
            ref.measure((_x, _y, w) => {
              if (w > 0) trackWidthRef.current = w;
            });
          }
        }}
        style={styles.trackContainer}
        onLayout={handleTrackLayout}
        {...panResponder.panHandlers}>
        {/* Background track */}
        <View style={styles.trackBg} />

        {/* Fill */}
        <View
          style={[
            styles.trackFill,
            {width: `${displayFraction * 100}%`},
          ]}
        />

        {/* Chapter marks */}
        {chapters && chapters.length > 0 && chapters.map((ch, i) => {
          const pct = duration > 0 ? (ch.startTime / duration) * 100 : 0;
          return (
            <View
              key={i}
              style={[
                styles.chapterMark,
                {left: `${pct}%`, top: trackHeight / 2 - 6},
              ]}
            />
          );
        })}

        {/* Thumb */}
        {displayFraction > 0 && (
          <View
            style={[
              styles.thumb,
              {left: `${displayFraction * 100}%`},
            ]}
          />
        )}

        {/* Preview bubble during scrubbing */}
        {isScrubbing && (
          <View
            style={[
              styles.previewBubbleWrapper,
              {left: `${scrubFraction * 100}%`, bottom: trackHeight + 8},
            ]}>
            <View style={styles.previewBubble}>
              <AppText style={styles.previewText}>
                {fmt(scrubFraction * durationSec)}
              </AppText>
            </View>
          </View>
        )}
      </View>

      <AppText variant="caption" color="primary" style={styles.timeLabel}>
        {fmt(duration)}
      </AppText>
    </View>
  );
};

export default SeekBar;
