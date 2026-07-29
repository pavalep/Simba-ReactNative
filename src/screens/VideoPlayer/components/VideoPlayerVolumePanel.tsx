import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Slider from '@react-native-community/slider';
import {useTheme} from '../../../theme';

interface Props {
  volume: number;
  muted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

export const VideoPlayerVolumePanel: React.FC<Props> = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, {color: colors.text.primary}]}>{muted ? 'Muted' : `${Math.round(volume)}%`}</Text>
        <TouchableOpacity
          style={[styles.muteButton, {borderColor: colors.border.subtle}]}
          onPress={onToggleMute}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
          <Text style={[styles.muteLabel, {color: colors.text.primary}]}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
      </View>
      <Slider
        value={muted ? 0 : volume}
        minimumValue={0}
        maximumValue={100}
        step={1}
        minimumTrackTintColor={colors.accent.gold}
        maximumTrackTintColor={colors.border.subtle}
        thumbTintColor={colors.accent.gold}
        onValueChange={onVolumeChange}
        accessibilityLabel="Volume"
      />
      <Text style={[styles.hint, {color: colors.text.secondary}]}>Drag to adjust volume</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingHorizontal: 20, paddingBottom: 16},
  valueRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  value: {fontSize: 24, fontWeight: '700'},
  muteButton: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10},
  muteLabel: {fontSize: 16, fontWeight: '600'},
  hint: {fontSize: 14, marginTop: 8},
});

