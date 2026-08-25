import React, {useCallback, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../../theme/tokens';
import {createVideoV3BufferPresentation} from '../domain/VideoV3BufferPolicy';
import type {VideoV3SessionSnapshot} from '../domain/VideoV3Types';

export interface VideoV3ProgressRailProps {
  readonly session: VideoV3SessionSnapshot;
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

export function VideoV3ProgressRail({session, onSeek}: VideoV3ProgressRailProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const duration = session.duration;
  const canSeek = session.isSeekable && duration !== null && duration > 0;
  const positionFraction = canSeek ? clampFraction(session.position / duration) : 0;
  const buffer = createVideoV3BufferPresentation(
    session.bufferedRanges,
    session.position,
    duration,
    session.cacheFill,
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(
    (event: NativeSyntheticEvent<NativeTouchEvent>) => {
      if (!canSeek || trackWidth <= 0 || duration === null) return;
      const fraction = clampFraction(event.nativeEvent.locationX / trackWidth);
      onSeek(fraction * duration);
    },
    [canSeek, duration, onSeek, trackWidth],
  );

  const activeRange = buffer.activeRange;
  const activeStart = activeRange && duration ? clampFraction(activeRange.start / duration) : 0;
  const activeEnd = activeRange && duration ? clampFraction(activeRange.end / duration) : 0;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Video position"
        accessibilityValue={{
          min: 0,
          max: duration ?? 0,
          now: canSeek ? session.position : 0,
          text: canSeek ? `${formatTime(session.position)} of ${formatTime(duration)}` : 'Not seekable',
        }}
        accessibilityState={{disabled: !canSeek, busy: session.isSeeking}}
        disabled={!canSeek}
        onLayout={handleLayout}
        onPress={handlePress}
        style={({pressed}) => [styles.hitArea, pressed && styles.pressed]}
      >
        <View style={styles.track}>
          {activeRange && duration !== null ? (
            <View
              pointerEvents="none"
              style={[styles.buffered, {left: `${activeStart * 100}%`, width: `${(activeEnd - activeStart) * 100}%`}]}
            />
          ) : null}
          <View pointerEvents="none" style={[styles.played, {width: `${positionFraction * 100}%`}]}/>
          <View pointerEvents="none" style={[styles.thumb, {left: `${positionFraction * 100}%`}]}/>
        </View>
      </Pressable>
      <View style={styles.timeRow}>
        <View style={styles.timeLabels}>
          <View style={styles.timeTextSlot}><TextTime value={formatTime(session.position)} /></View>
          <View style={styles.timeTextSlot}><TextTime value={formatTime(duration)} /></View>
        </View>
      </View>
    </View>
  );
}

function TextTime({value}: {value: string}) {
  return <Text style={styles.timeText}>{value}</Text>;
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  hitArea: {
    minHeight: 30,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.86,
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
  timeText: {
    color: cinemaColors.text.onMediaSoft,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
