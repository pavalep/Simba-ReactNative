import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';
import {createVideoBufferPresentation} from '../domain/VideoBufferPolicy';
import type {VideoChapter, VideoSessionSnapshot} from '../domain/VideoTypes';

export interface VideoProgressBookmark {
  readonly id: string;
  readonly position: number;
}

export interface VideoProgressRailProps {
  readonly session: VideoSessionSnapshot;
  readonly onSeek: (position: number) => void;
  /** T6.2: bookmark positions for the current source. The host
   *  owns the data source (Redux / `useBookmarks`); the rail
   *  receives a plain list of `{id, position}` to keep this
   *  component decoupled from the bookmarks store. */
  readonly bookmarks?: readonly VideoProgressBookmark[];
}

const RAIL_THROTTLE_MS = 1000;
const TOOLTIP_HALF_WIDTH = 36;

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatTime(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatRemaining(position: number | null, duration: number | null): string {
  if (
    position === null ||
    duration === null ||
    !Number.isFinite(position) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return '';
  }
  const remaining = duration - position;
  if (remaining <= 0) return '';
  return `−${formatTime(remaining)}`;
}

interface ChapterHint {
  readonly chapter: VideoChapter;
  readonly fraction: number;
}

function findChapterAt(
  chapters: readonly VideoChapter[],
  duration: number | null,
  fraction: number,
): ChapterHint | null {
  if (duration === null || duration <= 0 || chapters.length === 0) {
    return null;
  }
  for (const chapter of chapters) {
    if (chapter.endTime > 0) {
      const startFrac = clampFraction(chapter.startTime / duration);
      const endFrac = clampFraction(chapter.endTime / duration);
      if (fraction >= startFrac && fraction <= endFrac) {
        return {chapter, fraction};
      }
    } else {
      // Fall back to "next chapter wins" when endTime is 0.
      const startFrac = clampFraction(chapter.startTime / duration);
      if (fraction < startFrac) {
        return {chapter, fraction: startFrac};
      }
    }
  }
  return null;
}

export function VideoProgressRail({
  session,
  onSeek,
  bookmarks,
}: VideoProgressRailProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  // v11 T6.1: drag-scrub preview. When the user is dragging, the
  // current position is replaced by the dragged fraction; on release
  // we dispatch a single seek. State is intentionally local — the
  // session's `position` keeps moving independently while the user
  // drags, so we only need the *scrub* fraction.
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  // v11 T6.3: tap the right time label to toggle remaining ↔ total.
  // The toggle is local; the spec doesn't persist the choice.
  const [showTotal, setShowTotal] = useState(false);
  // v11 T6.3: position-driven re-render throttled to ≤ 1 Hz. The
  // session's 750 ms poll produces ~1.3 Hz render triggers; this
  // hook coalesces them to ≤ 1 Hz by only updating `displayedPosition`
  // when either the throttle has expired or the user is scrubbing.
  // The thumb + tick positions are derived from `displayedPosition`
  // (not `session.position`) so the rail's own re-renders are
  // decoupled from the session's re-render cycle.
  const [displayedPosition, setDisplayedPosition] = useState<number>(0);
  const lastDisplayedAt = useRef<number>(0);
  const duration = session.duration;
  // FIX (v11 hotfix): treating "duration not resolved yet" as LIVE put a
  // red LIVE pill on every VOD for the first seconds and disabled seeking.
  // LIVE is a source property; an unresolved duration only disables seek.
  const isLive = session.isLive;
  const canSeek = session.isSeekable && !isLive && duration !== null && duration > 0;

  // Bookmarks for the current source (T6.2). The host supplies
  // them via the `bookmarks` prop; the rail just lays them out.
  // The default `[]` keeps the component usable without bookmarks
  // (e.g. when the source is live or there are no bookmarks).
  const bookmarkList = bookmarks ?? [];

  const isScrubbing = scrubFraction !== null;
  useEffect(() => {
    if (isScrubbing) {
      // While dragging, follow the finger exactly — no throttle.
      setDisplayedPosition((scrubFraction ?? 0) * (duration ?? 0));
      return;
    }
    const now = Date.now();
    if (now - lastDisplayedAt.current >= RAIL_THROTTLE_MS) {
      setDisplayedPosition(session.position);
      lastDisplayedAt.current = now;
    }
  }, [
    session.position,
    isScrubbing,
    scrubFraction,
    duration,
  ]);

  const positionFraction = canSeek
    ? clampFraction(
        scrubFraction !== null
          ? scrubFraction
          : displayedPosition / (duration ?? 1),
      )
    : 0;
  const buffer = createVideoBufferPresentation(
    session.bufferedRanges,
    session.position,
    duration,
    session.cacheFill,
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const handlePressAt = useCallback(
    (locationX: number) => {
      if (!canSeek || trackWidth <= 0 || duration === null) return;
      const fraction = clampFraction(locationX / trackWidth);
      onSeek(fraction * duration);
    },
    [canSeek, duration, onSeek, trackWidth],
  );

  const onScrub = useCallback((fraction: number) => {
    setScrubFraction(clampFraction(fraction));
  }, []);
  const onScrubEnd = useCallback(() => {
    if (scrubFraction !== null && canSeek && duration !== null) {
      onSeek(scrubFraction * duration);
    }
    setScrubFraction(null);
  }, [scrubFraction, canSeek, duration, onSeek]);
  const pan = Gesture.Pan()
    .minDistance(0)
    .activeOffsetX([-2, 2])
    .onBegin(event => {
      'worklet';
      const width = trackWidth;
      if (width <= 0) return;
      runOnJS(onScrub)(event.x / width);
    })
    .onUpdate(event => {
      'worklet';
      const width = trackWidth;
      if (width <= 0) return;
      runOnJS(onScrub)(event.x / width);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onScrubEnd)();
    });
  const tap = Gesture.Tap()
    .maxDuration(220)
    .onEnd((event, success) => {
      if (!success) return;
      runOnJS(handlePressAt)(event.x);
    });
  // Race: a tap wins over a pan. Pan continues only if the user
  // actually moves their finger.
  const gesture = Gesture.Race(pan, tap);

  const activeRange = buffer.activeRange;
  const activeStart = activeRange && duration ? clampFraction(activeRange.start / duration) : 0;
  const activeEnd = activeRange && duration ? clampFraction(activeRange.end / duration) : 0;

  // T6.1: chapter hint for the tooltip. When the scrub position is
  // inside a chapter, the tooltip shows the chapter title.
  const scrubPosition =
    scrubFraction !== null && duration !== null
      ? scrubFraction * duration
      : null;
  const chapterHint = useMemo(() => {
    if (scrubPosition === null) return null;
    return findChapterAt(session.chapters, duration, scrubFraction ?? 0);
  }, [scrubPosition, session.chapters, duration, scrubFraction]);

  // T6.1: tooltip x-position is clamped to the rail ends so it
  // never renders off-screen. We translate the tooltip by the
  // minimum of (its own half-width) and (its pixel position within
  // the rail), keeping the tooltip within the track.
  const tooltipLeftPx =
    trackWidth > 0 ? positionFraction * trackWidth : 0;
  const tooltipTranslateX = Math.max(
    -TOOLTIP_HALF_WIDTH,
    Math.min(
      tooltipLeftPx,
      trackWidth > 0 ? trackWidth - TOOLTIP_HALF_WIDTH : 0,
    ) - tooltipLeftPx,
  );

  // T6.3: tap the right time label to toggle remaining ↔ total.
  const toggleTimeMode = useCallback(() => {
    setShowTotal(current => !current);
  }, []);

  // T6.3: remaining label. Hidden when duration is unknown or when
  // the remaining is ≤ 0 (live edge — no -0:00 flicker).
  const remainingText = isLive
    ? ''
    : formatRemaining(
        scrubPosition ?? session.position,
        duration,
      );
  const totalText = isLive ? '' : formatTime(duration);
  const rightText = showTotal ? totalText : remainingText;

  // T6.2: bookmark marker positions. Render a 4 px gold diamond at
  // each bookmark's position fraction.
  const bookmarkMarkers =
    canSeek && duration !== null && duration > 0
      ? bookmarkList
          .filter(b => b.position > 0 && b.position < duration)
          .map(b => ({
            id: b.id,
            fraction: clampFraction(b.position / duration),
          }))
      : [];

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={strings.videoProgressRail}
          accessibilityValue={{
            min: 0,
            max: duration ?? 0,
            now: canSeek ? displayedPosition : 0,
            text: canSeek ? `${formatTime(displayedPosition)} of ${formatTime(duration)}` : 'Not seekable',
          }}
          accessibilityState={{disabled: !canSeek, busy: session.isSeeking}}
          onLayout={handleLayout}
          style={styles.hitArea}
          testID="videoProgressRail"
        >
          <View style={styles.track}>
            {activeRange && duration !== null ? (
              <View
                pointerEvents="none"
                style={[styles.buffered, {left: `${activeStart * 100}%`, width: `${(activeEnd - activeStart) * 100}%`}]}
              />
            ) : null}
            {/* T6.2: chapter + bookmark markers sit under the thumb
                layer. They re-derive from the current duration on
                every render, so streams that resolve duration late
                (error fix in step 4) reflow correctly. */}
            {canSeek && duration !== null && duration > 0 && session.chapters.length > 1
              ? session.chapters.map(chapter => {
                  const fraction = clampFraction(chapter.startTime / duration);
                  const isActive = session.currentChapterId === chapter.id;
                  return (
                    <View
                      key={`chapter-${chapter.id}`}
                      pointerEvents="none"
                      testID={`videoProgressRail:chapter:${chapter.id}`}
                      style={[
                        styles.chapterMarker,
                        isActive && styles.chapterMarkerActive,
                        {left: `${fraction * 100}%`},
                      ]}
                    />
                  );
                })
              : null}
            {bookmarkMarkers.map(({id, fraction}) => (
              <View
                key={`bookmark-${id}`}
                pointerEvents="none"
                testID={`videoProgressRail:bookmark:${id}`}
                style={[styles.bookmarkMarker, {left: `${fraction * 100}%`}]}
              />
            ))}
            <View pointerEvents="none" style={[styles.played, {width: `${positionFraction * 100}%`}]}/>
            {/* T6.1: thumb clamps inside the track via a transform
                offset of half the thumb's width. The 12-px circle
                used to hang 6 px over each end (marginLeft: -6);
                the transform keeps the position math honest. */}
            <View
              pointerEvents="none"
              testID="videoProgressRail:thumb"
              style={[
                styles.thumb,
                {
                  left: `${positionFraction * 100}%`,
                  transform: [{translateX: -6}],
                },
              ]}
            />
          </View>
          {isScrubbing && duration !== null ? (
            <View
              pointerEvents="none"
              testID="videoProgressRail:tooltip"
              style={[
                styles.previewTooltip,
                {
                  left: `${positionFraction * 100}%`,
                  transform: [{translateX: tooltipTranslateX}],
                },
              ]}
            >
              <Text style={styles.previewText}>
                {scrubPosition !== null
                  ? formatTime(scrubPosition)
                  : formatTime(0)}
              </Text>
              {chapterHint ? (
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.previewChapter}
                >
                  {chapterHint.chapter.title}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        {/* T6.3: elapsed on the left. Hidden in LIVE mode. */}
        {isLive ? (
          <View style={styles.timeTextSlotLeft}>
            <Text style={styles.timeText}> </Text>
          </View>
        ) : (
          <View style={styles.timeTextSlotLeft}>
            <Text style={styles.timeText}>
              {formatTime(scrubPosition ?? session.position)}
            </Text>
          </View>
        )}
        {/* T6.3: right slot — LIVE pill (when live) or
            remaining/total (when not live). Tap the right label to
            toggle remaining ↔ total. The LIVE pill is non-tappable
            for now (live seek-to-edge is a future wave). */}
        {isLive ? (
          <View
            style={styles.livePill}
            testID="videoProgressRail:livePill"
            accessibilityLabel={strings.videoProgressRailLive}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showTotal ? strings.videoProgressRailTotal : strings.videoProgressRailRemaining}
            onPress={toggleTimeMode}
            testID="videoProgressRail:timeToggle"
            style={styles.timeTextSlotRight}
          >
            <Text
              style={[styles.timeText, !rightText && styles.timeTextMuted]}
            >
              {rightText || '—'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  hitArea: {
    minHeight: 30,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    width: '100%',
    backgroundColor: cinemaColors.text.tertiary,
    position: 'relative',
  },
  buffered: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: cinemaColors.text.onMediaMuted,
  },
  played: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: cinemaColors.accent.gold,
  },
  thumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    // T6.1: removed the `marginLeft: -6` overhang. The thumb is
    // now centred on the position fraction via a transform
    // offset of half its own width (`translateX: -6`). This
    // keeps the position math honest and never overhangs the
    // track ends (clampFraction is the source of truth).
    borderRadius: 6,
    backgroundColor: cinemaColors.text.bright,
  },
  chapterMarker: {
    // T6.2: 2×8 px tick at each chapter start (rendered as
    // `width: 2, height: 8` with a centred translateX so the tick
    // sits on the chapter start). Color: `text.onMediaMuted` so it
    // reads as a guide, not an active affordance.
    position: 'absolute',
    top: -2,
    width: 2,
    height: 8,
    backgroundColor: cinemaColors.text.onMediaMuted,
    transform: [{translateX: -1}],
  },
  chapterMarkerActive: {
    // The active chapter's tick widens and brightens to make the
    // current position visually obvious.
    width: 3,
    backgroundColor: cinemaColors.text.bright,
    transform: [{translateX: -1.5}],
  },
  bookmarkMarker: {
    // T6.2: 4 px gold diamond. Diamond = rotated 4×4 square.
    position: 'absolute',
    top: -2,
    width: 6,
    height: 6,
    backgroundColor: cinemaColors.accent.gold,
    transform: [{translateX: -3}, {rotate: '45deg'}],
  },
  previewTooltip: {
    position: 'absolute',
    top: -36,
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: cinemaColors.background.surfaceDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cinemaColors.accent.gold,
    alignItems: 'center',
  },
  previewText: {
    color: cinemaColors.text.bright,
    fontSize: 12,
    fontFamily: FONT_FAMILY.inter.bold,
    fontVariant: ['tabular-nums'],
  },
  previewChapter: {
    // Chapter name below the time when the scrub position is
    // inside a chapter. Smaller and muted so the time stays the
    // primary read.
    color: cinemaColors.text.onMediaMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY.inter.regular,
    maxWidth: 160,
    marginTop: 1,
  },
  timeRow: {
    minHeight: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTextSlotLeft: {
    minWidth: 54,
  },
  timeTextSlotRight: {
    minWidth: 54,
    alignItems: 'flex-end',
  },
  timeText: {
    color: cinemaColors.text.onMediaSoft,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.regular,
    fontVariant: ['tabular-nums'],
  },
  timeTextMuted: {
    color: cinemaColors.text.onMediaMuted,
    fontSize: 11,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: cinemaColors.semantic.errorDim,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: cinemaColors.semantic.error,
  },
  liveText: {
    color: cinemaColors.text.bright,
    fontSize: 10,
    fontFamily: FONT_FAMILY.inter.bold,
    letterSpacing: 0.8,
  },
});
