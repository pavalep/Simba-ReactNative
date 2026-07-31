import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {Dialog} from '../../../components/core/Dialog/Dialog';
import {SUBTITLE_COLOR_PRESETS} from '../../../constants/subtitleColors';
import type {ColorTokens} from '../../../theme/tokens';

interface SubtitleStyleDialogProps {
  visible: boolean;
  onClose: () => void;
  fontSize: number;
  textColor: string;
  bgOpacity: number;
  onFontSize: (px: number) => void;
  onTextColor: (color: string) => void;
  onBgOpacity: (opacity: number) => void;
  colors: ColorTokens;
}

const FONT_SIZES: Array<{px: number; label: string}> = [
  {px: 14, label: 'Small'},
  {px: 18, label: 'Medium'},
  {px: 24, label: 'Large'},
  {px: 32, label: 'XL'},
];

// 55.8: subtitle color palette is DATA (mpv sub-color values), shared via constants
const TEXT_COLORS: Array<{hex: string; label: string}> = SUBTITLE_COLOR_PRESETS;

const BG_OPACITIES: Array<{value: number; label: string}> = [
  {value: 0, label: 'None'},
  {value: 0.3, label: 'Light'},
  {value: 0.5, label: 'Medium'},
  {value: 0.8, label: 'Heavy'},
  {value: 1, label: 'Full'},
];

export const SubtitleStyleDialog: React.FC<SubtitleStyleDialogProps> = ({
  visible,
  onClose,
  fontSize,
  textColor,
  bgOpacity,
  onFontSize,
  onTextColor,
  onBgOpacity,
  colors,
}) => {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Subtitle Style"
      message="Changes apply to video playback immediately.">
      {/* Font size */}
      <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
        Font Size
      </AppText>
      <View style={styles.row}>
        {FONT_SIZES.map(opt => {
          const isSelected = fontSize === opt.px;
          return (
            <TouchableOpacity
              key={opt.px}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.accent.goldDim
                    : 'transparent',
                  borderColor: isSelected
                    ? colors.accent.gold
                    : colors.border.emphasis,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              onPress={() => onFontSize(opt.px)}>
              <AppText
                variant="caption"
                color={isSelected ? 'accent' : 'secondary'}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Text color */}
      <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
        Text Color
      </AppText>
      <View style={styles.row}>
        {TEXT_COLORS.map(opt => {
          const isSelected = textColor === opt.hex;
          return (
            <TouchableOpacity
              key={opt.hex}
              style={[
                styles.swatch,
                {
                  backgroundColor: opt.hex,
                  borderColor: isSelected
                    ? colors.accent.gold
                    : colors.border.emphasis,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              accessibilityLabel={`${opt.label} subtitle text`}
              onPress={() => onTextColor(opt.hex)}
            />
          );
        })}
      </View>

      {/* Background opacity */}
      <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
        Background Opacity
      </AppText>
      <View style={styles.row}>
        {BG_OPACITIES.map(opt => {
          const isSelected = Math.abs(bgOpacity - opt.value) < 0.01;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.accent.goldDim
                    : 'transparent',
                  borderColor: isSelected
                    ? colors.accent.gold
                    : colors.border.emphasis,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              onPress={() => onBgOpacity(opt.value)}>
              <AppText
                variant="caption"
                color={isSelected ? 'accent' : 'secondary'}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
});
