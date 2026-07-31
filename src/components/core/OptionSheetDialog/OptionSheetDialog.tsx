import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {Dialog} from '../../core/Dialog/Dialog';
import type {ColorTokens} from '../../../theme/tokens';

export interface OptionSheetOption {
  label: string;
  value: string | number;
}

interface OptionSheetDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  options: OptionSheetOption[];
  selectedValue: string | number | null;
  onSelect: (value: string | number) => void;
  onClose: () => void;
  colors: ColorTokens;
}

/**
 * Generic single-select option dialog (replaces Alert.alert list pickers).
 * Options render as tappable chips; the selected one is highlighted.
 */
export const OptionSheetDialog: React.FC<OptionSheetDialogProps> = ({
  visible,
  title,
  message,
  options,
  selectedValue,
  onSelect,
  onClose,
  colors,
}) => {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}>
      <View style={styles.row}>
        {options.map(opt => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
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
              accessibilityLabel={opt.label}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}>
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
});
