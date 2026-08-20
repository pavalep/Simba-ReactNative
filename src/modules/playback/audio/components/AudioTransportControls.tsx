import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {AppText} from '../../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../../theme/tokens';

interface Props {
  isPlaying: boolean;
  shuffle: boolean;
  loopMode: string;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  colors: ColorTokens;
  controlScale?: number;
}

export const AudioTransportControls: React.FC<Props> = ({
  isPlaying,
  shuffle,
  loopMode,
  onPlayPause,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleLoop,
  colors,
  controlScale = 1,
}) => {
  const scaled = (value: number) => value * controlScale;
  const loopLabel = loopMode === 'one' ? 'Repeat track' : loopMode === 'all' ? 'Repeat queue' : 'Repeat off';
  const loopColor = loopMode !== 'off' && loopMode !== 'none' ? colors.accent.gold : colors.text.secondary;

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scaled(18),
        },
        playBtn: {
          width: scaled(76),
          height: scaled(76),
          borderRadius: scaled(38),
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.accent.gold,
          shadowOpacity: 0.28,
          shadowRadius: 14,
          shadowOffset: {width: 0, height: 6},
          elevation: 6,
        },
        skipBtn: {
          width: scaled(52),
          height: scaled(52),
          borderRadius: scaled(26),
          alignItems: 'center',
          justifyContent: 'center',
        },
        utilityBtn: {
          minWidth: scaled(96),
          height: scaled(44),
          paddingHorizontal: scaled(12),
          borderRadius: scaled(22),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        utilityLabel: {
          fontSize: 12 * controlScale,
          letterSpacing: 0.2,
        },
      }),
    [colors, controlScale],
  );

  return (
    <View style={styles.stack}>
      <View style={dynamicStyles.transportRow}>
        <TouchableOpacity
          style={[dynamicStyles.skipBtn, {backgroundColor: colors.background.elevated}]}
          onPress={onPrev}
          activeOpacity={0.75}
          accessibilityLabel="Previous track"
          accessibilityHint="Play the previous item in the current audio queue"
          accessibilityRole="button">
          <SvgIcon name="skipBack" size={24 * controlScale} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.playBtn, {backgroundColor: colors.accent.gold}]}
          onPress={onPlayPause}
          activeOpacity={0.82}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityHint={isPlaying ? 'Pause the current audio' : 'Resume the current audio'}
          accessibilityRole="button">
          <SvgIcon
            name={isPlaying ? 'pause' : 'play'}
            size={34 * controlScale}
            color={colors.background.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.skipBtn, {backgroundColor: colors.background.elevated}]}
          onPress={onNext}
          activeOpacity={0.75}
          accessibilityLabel="Next track"
          accessibilityHint="Play the next item in the current audio queue"
          accessibilityRole="button">
          <SvgIcon name="skipForward" size={24 * controlScale} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.utilityRow}>
        <TouchableOpacity
          style={[dynamicStyles.utilityBtn, {backgroundColor: colors.background.elevated}]}
          onPress={onToggleShuffle}
          activeOpacity={0.75}
          accessibilityLabel={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          accessibilityRole="button"
          accessibilityState={{selected: shuffle}}>
          <SvgIcon name="shuffle" size={17 * controlScale} color={shuffle ? colors.accent.gold : colors.text.secondary} />
          <AppText variant="caption" style={[dynamicStyles.utilityLabel, {color: shuffle ? colors.accent.gold : colors.text.secondary}]}>
            Shuffle
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.utilityBtn, {backgroundColor: colors.background.elevated}]}
          onPress={onToggleLoop}
          activeOpacity={0.75}
          accessibilityLabel={loopLabel}
          accessibilityRole="button"
          accessibilityState={{selected: loopMode !== 'off' && loopMode !== 'none'}}>
          <SvgIcon name="repeat" size={17 * controlScale} color={loopColor} />
          <AppText variant="caption" style={[dynamicStyles.utilityLabel, {color: loopColor}]}>
            {loopMode === 'one' ? 'Repeat 1' : loopMode === 'all' ? 'Repeat all' : 'Repeat'}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
