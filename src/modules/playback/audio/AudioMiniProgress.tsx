import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

type AudioRange = {start: number; end: number};

interface AudioMiniProgressProps {
  position: number;
  duration: number;
  bufferedRanges: AudioRange[];
  isSeekable: boolean;
  isSeeking: boolean;
  isBuffering: boolean;
  accent: string;
  trackColor: string;
  bufferedColor: string;
  onSeek: (progress: number) => void;
}

/** Compact, independently interactive progress primitive for MiniAudio. */
export const AudioMiniProgress: React.FC<AudioMiniProgressProps> = ({
  position,
  duration,
  bufferedRanges,
  isSeekable,
  isSeeking,
  isBuffering,
  accent,
  trackColor,
  bufferedColor,
  onSeek,
}) => {
  const [width, setWidth] = useState(1);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safePosition = Number.isFinite(position) ? Math.max(0, Math.min(position, safeDuration || position)) : 0;
  const progress = safeDuration > 0 ? Math.max(0, Math.min(1, safePosition / safeDuration)) : 0;
  const disabled = !isSeekable || safeDuration <= 0;

  const handleSeek = (locationX: number) => {
    if (disabled) return;
    onSeek(Math.max(0, Math.min(1, locationX / Math.max(1, width))));
  };

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Playback position"
      accessibilityHint={disabled ? 'Seeking is unavailable for this audio' : 'Tap to seek within the audio'}
      accessibilityState={{disabled, busy: isSeeking || isBuffering}}
      accessibilityValue={{min: 0, max: safeDuration, now: safePosition}}
      disabled={disabled}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onPress={event => handleSeek(event.nativeEvent.locationX)}
      hitSlop={{top: 10, bottom: 10}}
      style={({pressed}) => [styles.hitArea, disabled && styles.disabled, pressed && styles.pressed]}>
      <View style={[styles.track, {backgroundColor: trackColor}]}>
        {bufferedRanges.map((range, index) => (
          <View
            key={`${range.start}-${range.end}-${index}`}
            pointerEvents="none"
            style={[styles.buffered, {left: `${(range.start / safeDuration) * 100}%`, width: `${((range.end - range.start) / safeDuration) * 100}%`, backgroundColor: bufferedColor}]}
          />
        ))}
        <View pointerEvents="none" style={[styles.fill, {width: `${progress * 100}%`, backgroundColor: accent}]} />
        <View pointerEvents="none" style={[styles.thumb, {left: `${progress * 100}%`, backgroundColor: accent}, (isSeeking || isBuffering) && styles.thumbBusy]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hitArea: {height: 26, justifyContent: 'center'},
  track: {height: 4, borderRadius: 4, position: 'relative', overflow: 'visible'},
  buffered: {position: 'absolute', top: 0, bottom: 0, borderRadius: 4, opacity: 0.95},
  fill: {position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4},
  thumb: {position: 'absolute', top: -3, width: 10, height: 10, borderRadius: 5, marginLeft: -5},
  thumbBusy: {transform: [{scale: 1.25}]},
  disabled: {opacity: 0.55},
  pressed: {opacity: 0.78},
});
