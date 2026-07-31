import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface Props {
  speed: number;
  onSelect: (speed: number) => void;
}

export const VideoPlayerSpeedPanel: React.FC<Props> = React.memo(({speed, onSelect}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      <AppText variant="body2" color="secondary" style={styles.hint}>
        Playback speed
      </AppText>
      <View style={styles.grid}>
        {SPEEDS.map(option => {
          const selected = Math.abs(speed - option) < 0.01;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                {borderColor: selected ? colors.accent.gold : colors.border.subtle},
                selected && {backgroundColor: colors.accent.goldDim},
              ]}
              onPress={() => onSelect(option)}
              accessibilityRole="button"
              accessibilityState={{selected}}
              accessibilityLabel={`${option} times speed`}>
              <AppText variant="body2" color={selected ? 'accent' : 'primary'}>
                {option === 1 ? '1×  Normal' : `${option}×`}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {paddingHorizontal: 20, paddingBottom: 20},
  hint: {marginBottom: 14},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  option: {
    minWidth: '30%',
    flexGrow: 1,
    minHeight: 52,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

