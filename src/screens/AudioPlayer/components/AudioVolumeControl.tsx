import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../theme/tokens';

interface Props {
  volume: number;
  onVolumeChange: (delta: number) => void;
  colors: ColorTokens;
}

export const AudioVolumeControl: React.FC<Props> = ({volume, onVolumeChange, colors}) => {
  return (
    <View style={styles.volumeRow}>
      <TouchableOpacity
        onPress={() => onVolumeChange(-10)}
        style={styles.volBtn}
        activeOpacity={0.7}
        accessibilityLabel="Volume down"
        accessibilityRole="button">
        <AppText variant="body2" color="secondary">{'−'}</AppText>
      </TouchableOpacity>
      <View style={styles.volTrack}>
        <View
          style={[
            styles.volFill,
            {backgroundColor: colors.accent.gold, width: `${volume}%`},
          ]}
        />
      </View>
      <AppText variant="caption" color="secondary" style={styles.volLabel}>
        {volume}%
      </AppText>
      <TouchableOpacity
        onPress={() => onVolumeChange(10)}
        style={styles.volBtn}
        activeOpacity={0.7}
        accessibilityLabel="Volume up"
        accessibilityRole="button">
        <AppText variant="body2" color="secondary">{'+'}</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  volBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volTrack: {
    width: 120,
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    borderRadius: 4,
  },
  volLabel: {
    minWidth: 40,
    textAlign: 'center',
  },
});
