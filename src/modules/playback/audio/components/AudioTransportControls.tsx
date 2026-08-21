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
  onRewind: () => void;
  onForward: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  colors: ColorTokens;
  controlScale?: number;
}

/**
 * Audio transport controls use explicit semantics:
 * previous/next change queue items, while rewind/forward seek within the
 * current item. The seek controls intentionally use text rather than the
 * track-skip glyphs so the action cannot be misunderstood.
 */
export const AudioTransportControls: React.FC<Props> = ({
  isPlaying,
  shuffle,
  loopMode,
  onPlayPause,
  onPrev,
  onNext,
  onRewind,
  onForward,
  onToggleShuffle,
  onToggleLoop,
  colors,
  controlScale = 1,
}) => {
  const scaled = (value: number) => value * controlScale;
  const loopEnabled = loopMode !== 'off' && loopMode !== 'none';
  const loopLabel = loopMode === 'one' ? 'Repeat track' : loopMode === 'all' ? 'Repeat queue' : 'Repeat off';
  const loopText = loopMode === 'one' ? 'Repeat 1' : loopMode === 'all' ? 'Repeat all' : 'Repeat';

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        primaryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scaled(10),
        },
        playButton: {
          width: scaled(72),
          height: scaled(72),
          borderRadius: scaled(36),
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.accent.gold,
          shadowOpacity: 0.32,
          shadowRadius: 16,
          shadowOffset: {width: 0, height: 7},
          elevation: 7,
        },
        trackButton: {
          width: scaled(48),
          height: scaled(48),
          borderRadius: scaled(24),
          alignItems: 'center',
          justifyContent: 'center',
        },
        seekButton: {
          width: scaled(52),
          height: scaled(48),
          borderRadius: scaled(24),
          alignItems: 'center',
          justifyContent: 'center',
        },
        seekText: {
          fontSize: scaled(13),
          lineHeight: scaled(16),
          letterSpacing: -0.2,
        },
        utilityButton: {
          minWidth: scaled(104),
          height: scaled(42),
          paddingHorizontal: scaled(12),
          borderRadius: scaled(21),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        },
        utilityLabel: {
          fontSize: scaled(12),
          letterSpacing: 0.15,
        },
      }),
    [colors, controlScale],
  );

  const surface = {backgroundColor: colors.background.elevated};
  const secondary = colors.text.secondary;

  return (
    <View style={styles.stack}>
      <View style={dynamicStyles.primaryRow}>
        <TouchableOpacity
          style={[dynamicStyles.seekButton, surface]}
          onPress={onRewind}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Rewind 10 seconds">
          <SvgIcon name="rewind10" size={scaled(25)} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.trackButton, surface]}
          onPress={onPrev}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          accessibilityHint="Play the previous item in the current audio queue">
          <SvgIcon name="prevTrack" size={scaled(22)} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.playButton, {backgroundColor: colors.accent.gold}]}
          onPress={onPlayPause}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityHint={isPlaying ? 'Pause the current audio' : 'Resume the current audio'}>
          <SvgIcon name={isPlaying ? 'pause' : 'play'} size={scaled(31)} color={colors.background.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.trackButton, surface]}
          onPress={onNext}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          accessibilityHint="Play the next item in the current audio queue">
          <SvgIcon name="nextTrack" size={scaled(22)} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.seekButton, surface]}
          onPress={onForward}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Forward 10 seconds">
          <SvgIcon name="forward10" size={scaled(25)} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.utilityRow}>
        <TouchableOpacity
          style={[dynamicStyles.utilityButton, surface]}
          onPress={onToggleShuffle}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          accessibilityState={{selected: shuffle}}>
          <SvgIcon name="shuffle" size={scaled(17)} color={shuffle ? colors.accent.gold : secondary} />
          <AppText variant="caption" style={[dynamicStyles.utilityLabel, {color: shuffle ? colors.accent.gold : secondary}]}>Shuffle</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.utilityButton, surface]}
          onPress={onToggleLoop}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={loopLabel}
          accessibilityState={{selected: loopEnabled}}>
          <SvgIcon name="repeat" size={scaled(17)} color={loopEnabled ? colors.accent.gold : secondary} />
          <AppText variant="caption" style={[dynamicStyles.utilityLabel, {color: loopEnabled ? colors.accent.gold : secondary}]}>{loopText}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: 18,
    marginBottom: 22,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
