import React, {useEffect, useRef, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {selectCurrentBufferedWindow} from './rangeNormalization';

export const formatAudioTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

interface AudioRange {
  start: number;
  end: number;
}

interface AudioProgressProps {
  position: number;
  duration: number;
  bufferedRanges: AudioRange[];
  isBuffering: boolean;
  isSeeking: boolean;
  isSeekable: boolean;
  onSeek: (progress: number) => void;
  accent: string;
  muted: string;
  buffered: string;
  // A10: cache fill ratio (0..1) for the current buffered window.
  // Rendered next to the BUFFERING status text so the user can see
  // download progress.
  cacheFill: number;
}

export const AudioProgress: React.FC<AudioProgressProps> = ({
  position,
  duration,
  bufferedRanges,
  isBuffering,
  isSeeking,
  isSeekable,
  onSeek,
  accent,
  muted,
  buffered,
  cacheFill,
}) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safePosition = Number.isFinite(position) ? Math.max(0, position) : 0;
  const progress = safeDuration > 0 ? Math.max(0, Math.min(1, safePosition / safeDuration)) : 0;
  const ranges = useMemo(
    () => selectCurrentBufferedWindow(bufferedRanges, safePosition, safeDuration),
    [bufferedRanges, safeDuration, safePosition],
  );

  const handlePress = (event: {nativeEvent: {locationX: number}}) => {
    if (!isSeekable || safeDuration <= 0) return;
    const fraction = Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, trackWidth)));
    onSeek(fraction);
  };


  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityHint={isSeekable ? 'Tap to seek within the audio' : 'Seeking is unavailable for this stream'}
        accessibilityState={{disabled: !isSeekable || safeDuration <= 0, busy: isSeeking || isBuffering}}
        accessibilityValue={{min: 0, max: safeDuration, now: Math.min(safePosition, safeDuration)}}
        onPress={handlePress}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        style={({pressed}) => [styles.trackHitArea, (!isSeekable || safeDuration <= 0) && styles.disabled, pressed && styles.pressed]}>
        <View style={[styles.track, {backgroundColor: muted}]}>
          {ranges.map((range, index) => (
            <View
              key={`${range.start}-${range.end}-${index}`}
              pointerEvents="none"
              style={[
                styles.bufferedRange,
                {
                  left: `${(range.start / safeDuration) * 100}%`,
                  width: `${((range.end - range.start) / safeDuration) * 100}%`,
                  backgroundColor: buffered,
                },
              ]}
            />
          ))}
          <View pointerEvents="none" style={[styles.fill, {width: `${progress * 100}%`, backgroundColor: accent}]} />
          <View pointerEvents="none" style={[styles.thumb, {left: `${progress * 100}%`, backgroundColor: accent}, (isSeeking || isBuffering) && styles.thumbActive]} />
        </View>
      </Pressable>
      <View style={styles.labels}>
        <Text style={[styles.time, {color: accent}]}>{formatAudioTime(safePosition)}</Text>
        {/* A10: while buffering, show the cache fill % next to the time.
            Clamped + rounded so we never display NaN or >100. */}
        {isBuffering ? (
          <Text style={[styles.time, {color: muted}]}>
            {Math.round(Math.max(0, Math.min(1, cacheFill)) * 100)}% cached
          </Text>
        ) : null}
        <Text style={[styles.time, {color: muted}]}>{safeDuration > 0 ? formatAudioTime(safeDuration) : 'LIVE'}</Text>
      </View>
    </View>
  );
};

interface AudioVolumeProps {
  volume: number;
  onChange: (delta: number) => void;
  icon: React.ReactNode;
  accent: string;
  muted: string;
}

export const AudioVolume: React.FC<AudioVolumeProps> = ({volume, onChange, icon, accent, muted}) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const lastVolumeRef = useRef(volume);

  useEffect(() => {
    lastVolumeRef.current = volume;
  }, [volume]);

  const updateAt = (locationX: number) => {
    const target = Math.round(Math.max(0, Math.min(100, (locationX / Math.max(1, trackWidth)) * 100)));
    const delta = target - lastVolumeRef.current;
    if (delta === 0) return;
    lastVolumeRef.current = target;
    onChange(delta);
  };

  return (
    <View style={styles.volumeRow}>
      {icon}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Volume"
        accessibilityValue={{min: 0, max: 100, now: volume}}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onPress={event => updateAt(event.nativeEvent.locationX)}
        onTouchStart={event => updateAt(event.nativeEvent.locationX)}
        onTouchMove={event => updateAt(event.nativeEvent.locationX)}
        style={styles.volumeTrackHitArea}>
        <View style={[styles.volumeTrack, {backgroundColor: muted}]}>
          <View style={[styles.volumeFill, {width: `${Math.max(0, Math.min(100, volume))}%`, backgroundColor: accent}]} />
        </View>
      </Pressable>
      <Text style={[styles.volumeLabel, {color: muted}]}>{Math.round(Math.max(0, Math.min(100, volume)))}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {marginTop: 24},
  trackHitArea: {height: 30, justifyContent: 'center'},
  track: {height: 6, borderRadius: 6, position: 'relative', overflow: 'visible'},
  bufferedRange: {position: 'absolute', top: 0, bottom: 0, borderRadius: 6, opacity: 0.95},
  fill: {position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6},
  thumb: {position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, marginLeft: -7},
  thumbActive: {transform: [{scale: 1.2}]},
  labels: {marginTop: 8, flexDirection: 'row', justifyContent: 'space-between'},
  time: {fontSize: 12, fontVariant: ['tabular-nums']},
  disabled: {opacity: 0.6},
  pressed: {opacity: 0.82},
  volumeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 10},
  volumeTrackHitArea: {flex: 1, height: 24, justifyContent: 'center'},
  volumeTrack: {height: 4, borderRadius: 4},
  volumeFill: {height: 4, borderRadius: 4},
  volumeLabel: {width: 34, textAlign: 'right', fontSize: 12},
});

export type {AudioRange};

// End of V2 progress primitive.
