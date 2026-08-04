import React, {useRef, useState, useCallback, useMemo, useEffect} from 'react';
import {View, PanResponder, Animated, TouchableOpacity, StyleSheet, LayoutChangeEvent, Image} from 'react-native';
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
  /** V5: buffered fraction [0..1] — rendered as a light-gray fill behind progress.
   *  Kept for backward compatibility with legacy callers (a single
   *  contiguous buffer from 0..fraction). For network streams with
   *  multiple buffered ranges, prefer `bufferedRanges` below. */
  bufferedFraction?: number;
  /**
   * YouTube-class buffered ranges — list of `{start, end}` in seconds
   * describing the portion of the stream currently resident in the
   * demuxer cache. Each range renders as a separate grey segment on the
   * track. Empty when no cache is active.
   */
  bufferedRanges?: Array<{start: number; end: number}>;
  /**
   * Whether seeking is permitted. False for live streams and unknown
   * length sources. The track is dimmed and the scrub thumb is hidden
   * when false so the user can see scrubbing isn't possible.
   */
  seekable?: boolean;
  /**
   * V6 9.3.1: optional thumbnail URI shown above the scrub bubble while
   * the user is scrubbing. Best-effort: until native thumbnail-strip
   * support ships, this is the first-frame thumbnail captured at
   * loadFile time (sessionRecent.thumbnailPath). When undefined, the
   * scrub bubble falls back to its text-only display.
   */
  thumbnailUri?: string;
}

// ─── Component ──────────────────────────────────────────────

const SeekBar: React.FC<SeekBarProps> = ({
  position: rawPosition,
  duration,
  onSeek,
  chapters,
  trackHeight = 16,
  bufferedFraction = 0,
  bufferedRanges,
  seekable = true,
  thumbnailUri,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();

  // V6 3.4.1: keep the thumb responsive. The previous 80ms debounce made
  // the bar feel sluggish while scrubbing; 16ms (~60fps) is the sweet spot
  // for smooth tracking without re-rendering the whole screen per frame.
  const position = useDebounce(rawPosition, 16);

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
        onStartShouldSetPanResponder: () => seekable,
        onMoveShouldSetPanResponder: () => seekable,

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
          paddingVertical: 0,
          paddingHorizontal: 4,
          gap: 10,
        },
        trackContainer: {
          flex: 1,
          height: trackHeight,
          justifyContent: 'center',
          position: 'relative',
        },
        // 3px thin track for a modern, refined look
        trackBg: {
          height: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.22)',
        },
        trackFill: {
          position: 'absolute',
          left: 0,
          top: trackHeight / 2 - 1.5,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.accent.gold,
        },
        /** V5: buffered fill — soft white at low opacity */
        trackBuffered: {
          position: 'absolute',
          left: 0,
          top: trackHeight / 2 - 1.5,
          height: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.5)',
          opacity: 0.5,
        },
        // 16px gold thumb with a soft halo and 1px white inner ring
        thumb: {
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.accent.gold,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.85)',
          top: trackHeight / 2 - 8,
          marginLeft: -8,
          shadowColor: colors.accent.gold,
          shadowOffset: {width: 0, height: 0},
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 4,
        },
        chapterMark: {
          position: 'absolute',
          width: 2,
          height: 10,
          backgroundColor: '#FFFFFF',
          opacity: 0.55,
          borderRadius: 1,
        },
        chapterMarkTouch: {
          position: 'absolute',
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: -12,
        },
        // Scrub bubble: floats BELOW the track so it doesn't collide with
        // the secondary toolbar above. While scrubbing, it overlays the
        // transport row but is pointerEvents:none so taps pass through.
        scrubBubbleWrap: {
          position: 'absolute',
          top: trackHeight + 6,
          width: 0,
          alignItems: 'center',
          zIndex: 6,
        },
        scrubBubble: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minWidth: 64,
          maxWidth: 180,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: 'rgba(10,10,12,0.92)',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.14)',
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.4,
          shadowRadius: 6,
          elevation: 6,
        },
        scrubBubbleTime: {
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
          fontSize: 12,
          color: colors.accent.gold,
        },
        scrubBubbleChapter: {
          flexShrink: 1,
          opacity: 0.85,
          fontSize: 11,
        },
        // V6 9.3.2: thumbnail preview sits above the time/chapter row
        // inside the same bubble. 16:9 aspect, fixed width so the
        // bubble doesn't jump around as the thumbnail loads.
        scrubThumbnail: {
          width: 120,
          height: 68,
          borderRadius: 6,
          backgroundColor: '#000000',
          marginBottom: 6,
        },
        scrubBubbleColumn: {
          alignItems: 'center',
        },
        timeLabel: {
          minWidth: 44,
          textAlign: 'center',
          fontSize: 11,
          fontWeight: '500',
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: 0.3,
          fontVariant: ['tabular-nums'],
        },
      }),
    [colors, trackHeight],
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.timeLabel}>
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
        <View style={[styles.trackBg, !seekable && {opacity: 0.4}]} />

        {/* YouTube-class buffered region fill. When `bufferedRanges` is
            provided (the streaming path), each range renders as a
            separate grey segment — handling multi-range network streams
            cleanly. Otherwise fall back to the legacy single-fill from
            0..bufferedFraction for callers that haven't migrated yet. */}
        {bufferedRanges && bufferedRanges.length > 0 && duration > 0 ? (
          bufferedRanges.map((r, i) => {
            const leftPct = Math.max(0, Math.min(100, (r.start / duration) * 100));
            const widthPct = Math.max(
              0,
              Math.min(100 - leftPct, ((r.end - r.start) / duration) * 100),
            );
            if (widthPct <= 0) return null;
            return (
              <View
                key={`buf-${i}-${r.start.toFixed(2)}-${r.end.toFixed(2)}`}
                style={[
                  styles.trackBuffered,
                  {left: `${leftPct}%`, width: `${widthPct}%`},
                ]}
              />
            );
          })
        ) : bufferedFraction > 0 ? (
          <View style={[styles.trackBuffered, {width: `${Math.min(bufferedFraction * 100, 100)}%`}]} />
        ) : null}

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
            <View style={[styles.scrubBubble, styles.scrubBubbleColumn]}>
              {thumbnailUri ? (
                <Image
                  source={{uri: thumbnailUri}}
                  style={styles.scrubThumbnail}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
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

      <AppText style={styles.timeLabel}>
        {fmtDuration(duration)}
      </AppText>
    </View>
  );
};

export default React.memo(SeekBar);
