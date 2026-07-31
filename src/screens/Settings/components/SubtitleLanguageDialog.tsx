import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {Dialog} from '../../../components/core/Dialog/Dialog';
import type {ColorTokens} from '../../../theme/tokens';

interface SubtitleLanguageDialogProps {
  visible: boolean;
  onClose: () => void;
  /** Current comma-separated language codes, e.g. "eng, jpn" */
  preferredLanguages: string;
  onSelect: (codes: string) => void;
  colors: ColorTokens;
}

const LANGUAGES: Array<{code: string; label: string}> = [
  {code: 'und', label: 'Default (auto)'},
  {code: 'eng', label: 'English'},
  {code: 'spa', label: 'Spanish'},
  {code: 'fre', label: 'French'},
  {code: 'ger', label: 'German'},
  {code: 'ita', label: 'Italian'},
  {code: 'por', label: 'Portuguese'},
  {code: 'jpn', label: 'Japanese'},
  {code: 'kor', label: 'Korean'},
  {code: 'chi', label: 'Chinese'},
  {code: 'ara', label: 'Arabic'},
  {code: 'rus', label: 'Russian'},
  {code: 'hin', label: 'Hindi'},
  {code: 'tur', label: 'Turkish'},
  {code: 'dut', label: 'Dutch'},
  {code: 'pol', label: 'Polish'},
  {code: 'swe', label: 'Swedish'},
  {code: 'dan', label: 'Danish'},
  {code: 'nor', label: 'Norwegian'},
  {code: 'fin', label: 'Finnish'},
  {code: 'gre', label: 'Greek'},
  {code: 'ind', label: 'Indonesian'},
  {code: 'tha', label: 'Thai'},
  {code: 'vie', label: 'Vietnamese'},
];

export const SubtitleLanguageDialog: React.FC<SubtitleLanguageDialogProps> = ({
  visible,
  onClose,
  preferredLanguages,
  onSelect,
  colors,
}) => {
  const currentCodes = preferredLanguages
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  const toggle = (code: string) => {
    const has = currentCodes.includes(code);
    let next: string[];
    if (code === 'und') {
      next = has ? [] : ['und'];
    } else {
      next = currentCodes.filter(c => c !== 'und');
      next = has ? next.filter(c => c !== code) : [...next, code];
    }
    onSelect(next.length > 0 ? next.join(', ') : 'und');
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Subtitle Language"
      message="Pick preferred subtitle languages (mpv slang). Tap to toggle.">
      <View style={styles.grid}>
        {LANGUAGES.map(lang => {
          const isSelected = currentCodes.includes(lang.code);
          return (
            <TouchableOpacity
              key={lang.code}
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
              accessibilityLabel={`${lang.label} subtitles`}
              onPress={() => toggle(lang.code)}>
              <AppText
                variant="caption"
                color={isSelected ? 'accent' : 'secondary'}>
                {lang.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    maxHeight: 320,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
