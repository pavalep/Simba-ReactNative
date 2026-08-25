import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AudioIcon} from './AudioIcon';
import {AudioVolume} from './AudioProgress';

interface AudioOutputControlProps {
  volume: number;
  onChange: (delta: number) => void;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  border: string;
}

/** Compact at rest; exposes the real volume control only during adjustment. */
export const AudioOutputControl: React.FC<AudioOutputControlProps> = ({
  volume,
  onChange,
  primary,
  secondary,
  accent,
  surface,
  border,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide volume control' : 'Show volume control'}
        accessibilityState={{expanded}}
        onPress={() => setExpanded(value => !value)}
        style={({pressed}) => [styles.trigger, {backgroundColor: surface, borderColor: border}, pressed && styles.pressed]}>
        <AudioIcon name="volume" size={18} color={secondary} />
        <Text style={[styles.label, {color: primary}]}>Volume</Text>
        <AudioIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} color={secondary} />
      </Pressable>
      {expanded ? (
        <View style={[styles.panel, {backgroundColor: surface, borderColor: border}]}>
          <AudioVolume volume={volume} onChange={onChange} accent={accent} muted={border} icon={<AudioIcon name="volume" size={18} color={secondary} />} />
          <Text style={[styles.value, {color: secondary}]}>{Math.round(Math.max(0, Math.min(100, volume)))}%</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {marginTop: 12},
  trigger: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16},
  label: {flex: 1, fontSize: 13, fontWeight: '700'},
  panel: {marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16},
  value: {fontSize: 11, textAlign: 'right', marginTop: -2},
  pressed: {opacity: 0.72},
});
