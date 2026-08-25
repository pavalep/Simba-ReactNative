import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {VideoV2Button} from './VideoV2Button';

type Props = {
  volume: number;
  muted: boolean;
  accent: string;
  trackColor: string;
  textColor: string;
  secondaryColor: string;
  onChange: (volume: number) => void;
  onToggleMute: () => void;
};

export const VideoV2VolumeControl: React.FC<Props> = ({volume, muted, accent, trackColor, textColor, secondaryColor, onChange, onToggleMute}) => {
  const [width, setWidth] = useState(1);
  const value = Math.max(0, Math.min(100, Number.isFinite(volume) ? volume : 0));
  const setFromX = (x: number) => {
    const next = Math.round(Math.max(0, Math.min(1, x / Math.max(1, width))) * 100);
    if (muted && next > 0) onToggleMute();
    onChange(next);
  };
  return (
    <View style={styles.root}>
      <View style={styles.header}><Text style={[styles.label, {color: textColor}]}>Volume</Text><Text style={[styles.value, {color: secondaryColor}]}>{muted ? 'Muted' : `${Math.round(value)}%`}</Text><VideoV2Button icon={muted ? 'volumeOff' : 'volume'} label={muted ? 'Unmute video' : 'Mute video'} onPress={onToggleMute} color={textColor} selected={muted} size={40} /></View>
      <Pressable accessibilityRole="adjustable" accessibilityLabel="Video volume" accessibilityHint="Tap or drag to adjust volume" accessibilityValue={{min: 0, max: 100, now: muted ? 0 : value}} onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={event => setFromX(event.nativeEvent.locationX)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onTouchMove={event => setFromX(event.nativeEvent.locationX)} hitSlop={{top: 10, bottom: 10}} style={styles.hitArea}>
        <View style={[styles.track, {backgroundColor: trackColor}]}><View style={[styles.fill, {width: `${muted ? 0 : value}%`, backgroundColor: accent}]} /><View style={[styles.thumb, {left: `${muted ? 0 : value}%`, backgroundColor: accent}]} /></View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {paddingVertical: 10},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10},
  label: {flex: 1, fontSize: 15, fontWeight: '700'},
  value: {fontSize: 13, fontVariant: ['tabular-nums']},
  hitArea: {height: 38, justifyContent: 'center'},
  track: {height: 6, borderRadius: 6, position: 'relative'},
  fill: {position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6},
  thumb: {position: 'absolute', top: -5, width: 16, height: 16, marginLeft: -8, borderRadius: 8},
});
