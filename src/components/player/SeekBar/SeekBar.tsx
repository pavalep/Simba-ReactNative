import React, {useRef, useState, useCallback, useMemo, useEffect} from 'react';
import {View, PanResponder, Animated, TouchableOpacity, StyleSheet, LayoutChangeEvent} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {useDebounce} from '../../../hooks/useDebounce';

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

/** Format duration, showing "Live" for zero / unknown lengths (e.g. streams). */
function fmtDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return 'Live';
  return fmt(seconds);
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
  /** V5: buffered fraction [0..1] — rendered as a light-gray fill behind progress */
  bufferedFraction?: number;
}

// ─── Component ──────────────────────────────────────────────

const SeekBar: React.FC<SeekBarProps> = ({
  position: rawPosition,
  duration,
  onSeek,
  chapters,
  trackHeight = 16,
  bufferedFraction = 0,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();

  // Keep the thumb responsive without allowing a fast native event stream to
  // make the rest of the screen feel busy.
  const position = useDebounce(rawPosition, 80);

  // Track layout
  const trackWidthRef = useRef(0);

  // Scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  const scrubFractionRef = useRef(0);
  const panAnim = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const durationSec = duration || 1;
  const positionFrac = duration > 0 ? Math.min(position / duration, 1) : 0;
  const displayFraction = isScrubbing ? scrubFraction : positionFrac;

  // ── Scrub preview bubble (31.4): live time + active chapter while dragging ──
  const scrubTime = scrubFraction * durationSec;
  const activeChapterTitle = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    let current: string | null = null;
    for (const ch of chapters) {
      if (ch.startTime <= scrubTime && ch.title) {
        current = ch.title;
      }
    }
    return current;
  }, [chapters, scrubTime]);

  // ── Chapter marks pulse animation ──
  useEffect(() => {
    if (!chapters || chapters.length === 0) return;
    if (reduceMotion) {
      // 59.7: reduced motion — static marks, no pulse loop
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chapters, pulseAnim, reduceMotion]);

  const markOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

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
          Animated.spring(thumbScale, {
            toValue: 1.7,
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
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 100,
          }).start();
        },
      }),
    [onSeek, panAnim, thumbScale],
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
          // V2-fix: was paddingVertical: 6 (added 12px around the bar).
          // Removed vertical padding so the bar fits inside the bottom panel
          // without colliding with the transport row below or the secondary
          // toolbar above. Horizontal padding is owned by the parent.
          paddingVertical: 0,
          paddingHorizontal: 12,
          gap: 8,
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
        /** V5: buffered fill — light gray behind progress */
        trackBuffered: {
          position: 'absolute',
          left: 0,
          top: trackHeight / 2 - 2,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.text.tertiary,
          opacity: 0.4,
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
        chapterMarkTouch: {
          position: 'absolute',
          width: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: -10,
        },
        // V2-fix: scrub bubble now floats BELOW the track (positive top)
        // instead of above, because the secondary toolbar is already pinned
        // to the top of the bottom panel and would otherwise cover it.
        scrubBubbleWrap: {
          position: 'absolute',
          top: trackHeight + 4,
          width: 0,
          alignItems: 'center',
          zIndex: 6,
        },
        scrubBubble: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minWidth: 56,
          maxWidth: 168,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 10,
          backgroundColor: colors.background.scrimStrong,
          borderWidth: 1,
          borderColor: colors.border.emphasis,
        },
        scrubBubbleTime: {
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        },
        scrubBubbleChapter: {
          flexShrink: 1,
          opacity: 0.85,
        },
        timeLabel: {
          minWidth: 40,
          textAlign: 'center',
          fontSize: 11,
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
        accessibilityRole="adjustable"
        accessibilityLabel={`Playback seek bar, ${Math.round(displayFraction * 100)} percent`}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(displayFraction * 100),
        }}
        onAccessibilityAction={event => {
          // 59.6: TalkBack swipe up/down steps the position by 5%
          if (event.nativeEvent.actionName === 'increment') {
            onSeek(Math.min(1, displayFraction + 0.05));
          } else if (event.nativeEvent.actionName === 'decrement') {
            onSeek(Math.max(0, displayFraction - 0.05));
          }
        }}
        {...panResponder.panHandlers}>
        {/* Background track */}
        <View style={styles.trackBg} />

        {/* V5: Buffered region fill (gray, behind progress) */}
        {bufferedFraction > 0 && (
          <View style={[styles.trackBuffered, {width: `${Math.min(bufferedFraction * 100, 100)}%`}]} />
        )}

        {/* Fill */}
        <View
          style={[
            styles.trackFill,
            {width: `${displayFraction * 100}%`},
          ]}
        />

        {/* Chapter marks with tap-to-seek */}
        {chapters && chapters.length > 0 && chapters.map((ch, i) => {
          const pct = duration > 0 ? (ch.startTime / duration) * 100 : 0;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => onSeek(ch.startTime / durationSec)}
              style={[
                styles.chapterMarkTouch,
                {left: `${pct}%`, top: trackHeight / 2 - 10},
              ]}>
              <Animated.View
                style={[
                  styles.chapterMark,
                  {height: trackHeight - 4, opacity: markOpacity},
                ]}
              />
            </TouchableOpacity>
          );
        })}

        {/* Scrub preview bubble (31.4): floats above the thumb while dragging */}
        {isScrubbing && (
          <View
            pointerEvents="none"
            style={[
              styles.scrubBubbleWrap,
              {left: `${Math.max(6, Math.min(94, displayFraction * 100))}%`},
            ]}>
            <View style={styles.scrubBubble}>
              <AppText variant="caption" color="accent" style={styles.scrubBubbleTime}>
                {fmt(scrubFraction * durationSec)}
              </AppText>
              {activeChapterTitle && (
                <AppText
                  variant="caption"
                  color="primary"
                  numberOfLines={1}
                  style={styles.scrubBubbleChapter}>
                  {activeChapterTitle}
                </AppText>
              )}
            </View>
          </View>
        )}

        {/* Thumb */}
        {displayFraction > 0 && (
          <Animated.View
            style={[
              styles.thumb,
              {left: `${displayFraction * 100}%`},
              {transform: [{scale: thumbScale}]},
            ]}
          />
        )}
      </View>

      <AppText variant="caption" color="primary" style={styles.timeLabel}>
        {fmtDuration(duration)}
      </AppText>
    </View>
  );
};

export default React.memo(SeekBar);
