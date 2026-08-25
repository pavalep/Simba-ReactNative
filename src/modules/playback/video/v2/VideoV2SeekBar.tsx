import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

interface VideoV2SeekBarProps {
  position: number;
  duration: number;
  bufferedRanges: Array<{start: number; end: number}>;
  isSeekable: boolean;
  isSeeking: boolean;
  isBuffering: boolean;
  accent: string;
  trackColor: string;
  bufferedColor: string;
  textColor: string;
  onSeek: (progress: number) => void;
  compact?: boolean;
}

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const VideoV2SeekBar: React.FC<VideoV2SeekBarProps> = ({position, duration, bufferedRanges, isSeekable, isSeeking, isBuffering, accent, trackColor, bufferedColor, textColor, onSeek, compact = false}) => {
  const [width, setWidth] = useState(1);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safePosition = safeDuration > 0 ? Math.max(0, Math.min(safeDuration, position)) : 0;
  const progress = safeDuration > 0 ? safePosition / safeDuration : 0;
  const disabled = !isSeekable || safeDuration <= 0;
  const safeRanges = safeDuration > 0 ? bufferedRanges.map(range => ({
    start: Math.max(0, Math.min(safeDuration, range.start)),
    end: Math.max(0, Math.min(safeDuration, range.end)),
  })).filter(range => range.end > range.start) : [];

  const handleSeek = (locationX: number) => {
    if (disabled) return;
    onSeek(Math.max(0, Math.min(1, locationX / Math.max(1, width))));
  };

  return (
    <View style={[styles.wrapper, compact && styles.compactWrapper]}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Video playback position"
        accessibilityHint={disabled ? 'Seeking is unavailable for this video' : 'Tap or drag to seek'}
        accessibilityState={{disabled, busy: isSeeking || isBuffering}}
        accessibilityValue={{min: 0, max: safeDuration, now: safePosition}}
        disabled={disabled}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        onPress={event => handleSeek(event.nativeEvent.locationX)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onTouchStart={event => handleSeek(event.nativeEvent.locationX)}
        onTouchMove={event => handleSeek(event.nativeEvent.locationX)}
        hitSlop={{top: 10, bottom: 10}}
        style={({pressed}) => [styles.hitArea, compact && styles.compactHitArea, disabled && styles.disabled, pressed && styles.pressed]}>
        <View style={[styles.track, {backgroundColor: trackColor}]}>
          {safeRanges.map((range, index) => (
            <View key={`${range.start}-${range.end}-${index}`} pointerEvents="none" style={[styles.range, {left: `${(range.start / safeDuration) * 100}%`, width: `${((range.end - range.start) / safeDuration) * 100}%`, backgroundColor: bufferedColor}]} />
          ))}
          <View pointerEvents="none" style={[styles.fill, {width: `${progress * 100}%`, backgroundColor: accent}]} />
          <View pointerEvents="none" style={[styles.thumb, {left: `${progress * 100}%`, backgroundColor: accent}, (isSeeking || isBuffering) && styles.thumbBusy]} />
        </View>
      </Pressable>
      {!compact ? <View style={styles.labels}>
        <Text style={[styles.time, {color: textColor}]}>{formatTime(safePosition)}</Text>
        <Text style={[styles.time, {color: textColor}]}>{safeDuration > 0 ? formatTime(safeDuration) : 'LIVE'}</Text>
      </View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {width: '100%'},
  compactWrapper: {marginTop: 2},
  hitArea: {height: 32, justifyContent: 'center'},
  compactHitArea: {height: 20},
  track: {height: 5, borderRadius: 5, position: 'relative', overflow: 'visible'},
  range: {position: 'absolute', top: 0, bottom: 0, borderRadius: 5, opacity: 0.96},
  fill: {position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5},
  thumb: {position: 'absolute', top: -3.5, width: 12, height: 12, marginLeft: -6, borderRadius: 6},
  thumbBusy: {transform: [{scale: 1.18}]},
  labels: {flexDirection: 'row', justifyContent: 'space-between'},
  time: {fontSize: 11, fontVariant: ['tabular-nums']},
  disabled: {opacity: 0.55},
  pressed: {opacity: 0.78},
});
