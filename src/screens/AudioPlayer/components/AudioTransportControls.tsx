import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {ColorTokens} from '../../../theme/tokens';

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
  /** 46.1: accessibility scale for control sizes (1 = default, >1 = larger) */
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
  const loopColor = loopMode !== 'none' ? colors.accent.gold : colors.text.secondary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 24,
        },
        playBtn: {
          width: 72 * controlScale,
          height: 72 * controlScale,
          borderRadius: 36 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        skipBtn: {
          width: 44 * controlScale,
          height: 44 * controlScale,
          borderRadius: 22 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        secondaryBtn: {
          width: 44 * controlScale,
          height: 44 * controlScale,
          borderRadius: 22 * controlScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [controlScale],
  );

  return (
    <View style={styles.transportRow}>
      <TouchableOpacity
        style={[styles.secondaryBtn, {backgroundColor: colors.border.subtle}]}
        onPress={onToggleShuffle}
        activeOpacity={0.7}
        accessibilityLabel="Toggle shuffle"
        accessibilityRole="button"
        accessibilityState={{selected: shuffle}}>
        <SvgIcon
          name="shuffle"
          size={18}
          color={shuffle ? colors.accent.gold : colors.text.secondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onPrev}
        activeOpacity={0.7}
        accessibilityLabel="Previous track"
        accessibilityRole="button">
        <SvgIcon name="skipBack" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.playBtn, {backgroundColor: colors.accent.gold}]}
        onPress={onPlayPause}
        activeOpacity={0.8}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        accessibilityRole="button">
        <SvgIcon
          name={isPlaying ? 'pause' : 'play'}
          size={32}
          color={colors.background.primary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onNext}
        activeOpacity={0.7}
        accessibilityLabel="Next track"
        accessibilityRole="button">
        <SvgIcon name="skipForward" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, {backgroundColor: colors.border.subtle}]}
        onPress={onToggleLoop}
        activeOpacity={0.7}
        accessibilityLabel="Toggle loop mode"
        accessibilityRole="button"
        accessibilityState={{selected: loopMode !== 'none'}}>
        <SvgIcon
          name="repeat"
          size={18}
          color={loopColor}
        />
      </TouchableOpacity>
    </View>
  );
};
