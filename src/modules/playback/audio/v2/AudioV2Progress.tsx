import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export const formatAudioTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

interface AudioV2ProgressProps {
  position: number;
  duration: number;
  onSeek: (progress: number) => void;
  accent: string;
  muted: string;
}

export const AudioV2Progress: React.FC<AudioV2ProgressProps> = ({
  position,
  duration,
  onSeek,
  accent,
  muted,
}) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const progress = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
  const handlePress = (event: {nativeEvent: {locationX: number}}) => {
    onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, trackWidth))));
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityValue={{min: 0, max: duration || 0, now: position}}
        onPress={handlePress}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        style={styles.trackHitArea}>
        <View style={[styles.track, {backgroundColor: muted}]}>
          <View style={[styles.fill, {width: `${progress * 100}%`, backgroundColor: accent}]} />
          <View style={[styles.thumb, {left: `${progress * 100}%`, backgroundColor: accent}]} />
        </View>
      </Pressable>
      <View style={styles.labels}>
        <Text style={[styles.time, {color: accent}]}>{formatAudioTime(position)}</Text>
        <Text style={[styles.time, {color: muted}]}>{duration > 0 ? formatAudioTime(duration) : 'LIVE'}</Text>
      </View>
    </View>
  );
};

interface AudioV2VolumeProps {
  volume: number;
  onChange: (delta: number) => void;
  icon: React.ReactNode;
  accent: string;
  muted: string;
}

export const AudioV2Volume: React.FC<AudioV2VolumeProps> = ({volume, onChange, icon, accent, muted}) => (
  <View style={styles.volumeRow}>
    {icon}
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Volume"
      accessibilityValue={{min: 0, max: 100, now: volume}}
      onPress={event => onChange(event.nativeEvent.locationX > 70 ? 8 : -8)}
      style={styles.volumeTrackHitArea}>
      <View style={[styles.volumeTrack, {backgroundColor: muted}]}>
        <View style={[styles.volumeFill, {width: `${Math.max(0, Math.min(100, volume))}%`, backgroundColor: accent}]} />
      </View>
    </Pressable>
    <Text style={[styles.volumeLabel, {color: muted}]}>{Math.round(Math.max(0, Math.min(100, volume)))}%</Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {marginTop: 24},
  trackHitArea: {height: 30, justifyContent: 'center'},
  track: {height: 4, borderRadius: 4, position: 'relative'},
  fill: {height: 4, borderRadius: 4},
  thumb: {position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, marginLeft: -7},
  labels: {marginTop: 8, flexDirection: 'row', justifyContent: 'space-between'},
  time: {fontSize: 12, fontVariant: ['tabular-nums']},
  volumeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 10},
  volumeTrackHitArea: {flex: 1, height: 24, justifyContent: 'center'},
  volumeTrack: {height: 4, borderRadius: 4},
  volumeFill: {height: 4, borderRadius: 4},
  volumeLabel: {width: 34, textAlign: 'right', fontSize: 12},
});
