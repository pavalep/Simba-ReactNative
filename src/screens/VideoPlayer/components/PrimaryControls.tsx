import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import SeekBar from '../../../components/player/SeekBar/SeekBar';

// ─── Props ─────────────────────────────────────────────────

export interface PrimaryControlsProps {
  position: number;
  duration: number;
  isPlaying: boolean;
  chapters: Array<{startTime: number; title?: string}>;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (pct: number) => void;
  bottomInset: number;
}

// ─── Component ──────────────────────────────────────────────

export const PrimaryControls: React.FC<PrimaryControlsProps> = ({
  position,
  duration,
  isPlaying,
  chapters,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  bottomInset,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          paddingBottom: bottomInset + 8,
        },
        seekBarWrapper: {
          marginBottom: 2,
        },
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          paddingHorizontal: 24,
          paddingVertical: 4,
        },
        transportBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        playBtn: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors, bottomInset],
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Seek bar */}
      <View style={styles.seekBarWrapper}>
        <SeekBar
          position={position}
          duration={duration}
          chapters={chapters}
          onSeek={onSeek}
        />
      </View>

      {/* Transport controls */}
      <View style={styles.transportRow}>
        {/* Previous */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipBack" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={onPlayPause}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon name="skipForward" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PrimaryControls;
