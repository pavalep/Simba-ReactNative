import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Slider from '@react-native-community/slider';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';

interface Props {
  volume: number;
  muted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

export const VideoPlayerVolumePanel: React.FC<Props> = React.memo(({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <AppText style={[styles.value, {color: colors.text.primary}]}>{muted ? 'Muted' : `${Math.round(volume)}%`}</AppText>
        <TouchableOpacity
          style={[styles.muteButton, {borderColor: colors.border.subtle}]}
          onPress={onToggleMute}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
          <AppText style={[styles.muteLabel, {color: colors.text.primary}]}>{muted ? 'Unmute' : 'Mute'}</AppText>
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
      <AppText style={[styles.hint, {color: colors.text.secondary}]}>Drag to adjust volume</AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {paddingHorizontal: 20, paddingBottom: 16},
  valueRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  value: {fontSize: 24, fontWeight: '700'},
  muteButton: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10},
  muteLabel: {fontSize: 16, fontWeight: '600'},
  hint: {fontSize: 14, marginTop: 8},
});

