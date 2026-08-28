import React, {useCallback, useState} from 'react';
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
import {createVideoBufferPresentation} from '../domain/VideoBufferPolicy';
import type {VideoSessionSnapshot} from '../domain/VideoTypes';

export interface VideoProgressRailProps {
  readonly session: VideoSessionSnapshot;
  readonly onSeek: (position: number) => void;
}

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

/** W5.3: remaining-time label (e.g. "−1:23"). Shows the distance
 *  from the current position to the end of the media. Empty if
 *  duration is unknown. */
function formatRemaining(position: number | null, duration: number | null): string {
  if (position === null || duration === null || !Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return '';
  const remaining = duration - position;
  if (remaining <= 0) return '';
  return `−${formatTime(remaining)}`;
}

export function VideoProgressRail({session, onSeek}: VideoProgressRailProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  // W5.3: drag-scrub preview. When the user is dragging, the
  // current position is replaced by the dragged fraction; on release
  // we dispatch a single seek. State is intentionally local — the
  // session's `position` keeps moving independently while the user
  // drags, so we only need the *scrub* fraction.
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const duration = session.duration;
  const isLive = duration === null || duration <= 0;
  const canSeek = session.isSeekable && !isLive;
  // While dragging, show the scrub position; otherwise the live position.
  const positionFraction = canSeek
    ? clampFraction(
        scrubFraction !== null
          ? scrubFraction
          : session.position / (duration ?? 1),
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

  // W5.3: drag-scrub. `Gesture.Pan().minDistance(0)` starts the moment
  // a touch lands (so a quick tap is still recognised as press), then
  // the worklet updates the local `scrubFraction` for preview rendering.
  // On end, we dispatch one seek and clear the scrub.
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

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Video position"
          accessibilityValue={{
            min: 0,
            max: duration ?? 0,
            now: canSeek ? session.position : 0,
            text: canSeek ? `${formatTime(session.position)} of ${formatTime(duration)}` : 'Not seekable',
          }}
          accessibilityState={{disabled: !canSeek, busy: session.isSeeking}}
          onLayout={handleLayout}
          style={styles.hitArea}>
          <View style={styles.track}>
            {activeRange && duration !== null ? (
              <View
                pointerEvents="none"
                style={[styles.buffered, {left: `${activeStart * 100}%`, width: `${(activeEnd - activeStart) * 100}%`}]}
              />
            ) : null}
            {session.chapters.length > 0 && duration !== null && duration > 0
              ? session.chapters.map(chapter => {
                  const fraction = clampFraction(chapter.startTime / duration);
                  const isActive = session.currentChapterId === chapter.id;
                  return (
                    <View
                      key={`chapter-${chapter.id}`}
                      pointerEvents="none"
                      style={[
                        styles.chapterMarker,
                        isActive && styles.chapterMarkerActive,
                        {left: `${fraction * 100}%`},
                      ]}
                    />
                  );
                })
              : null}
            <View pointerEvents="none" style={[styles.played, {width: `${positionFraction * 100}%`}]}/>
            <View pointerEvents="none" style={[styles.thumb, {left: `${positionFraction * 100}%`}]}/>
          </View>
          {scrubFraction !== null ? (
            <View
              pointerEvents="none"
              style={[styles.previewTooltip, {left: `${positionFraction * 100}%`}]}>
              <Text style={styles.previewText}>
                {formatTime(scrubFraction * (duration ?? 0))}
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        <View style={styles.timeLabels}>
          <View style={styles.timeTextSlot}>
            {/* W5.3: position is followed by a "−remaining" label
                in the same slot, so the row reads "1:23 −0:45". The
                remaining is omitted if duration is unknown (live
                streams). */}
            <View style={styles.timeCluster}>
              <TextTime value={formatTime(session.position)} />
              <TextTime value={formatRemaining(session.position, duration)} muted />
            </View>
          </View>
          <View style={styles.timeTextSlot}>
            {/* W5.3: "LIVE" pill when duration is missing / invalid. */}
            {isLive ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            ) : (
              <TextTime value={formatTime(duration)} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function TextTime({value, muted = false}: {value: string; muted?: boolean}) {
  if (!value) return <Text style={styles.timeText} />;
  return <Text style={[styles.timeText, muted && styles.timeTextMuted]}>{value}</Text>;
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
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: cinemaColors.text.bright,
  },
  chapterMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 10,
    marginLeft: -1,
    backgroundColor: cinemaColors.accent.gold,
    opacity: 0.7,
  },
  chapterMarkerActive: {
    opacity: 1,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: cinemaColors.text.bright,
  },
  // W5.3: preview tooltip that floats above the thumb during drag.
  previewTooltip: {
    position: 'absolute',
    top: -32,
    transform: [{translateX: -28}],
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
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeRow: {
    minHeight: 25,
    justifyContent: 'center',
  },
  timeLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeTextSlot: {
    minWidth: 54,
  },
  timeCluster: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  timeText: {
    color: cinemaColors.text.onMediaSoft,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  timeTextMuted: {
    color: cinemaColors.text.onMediaMuted,
    fontSize: 11,
  },
  // W5.3: "LIVE" pill for streams without a known duration.
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
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
