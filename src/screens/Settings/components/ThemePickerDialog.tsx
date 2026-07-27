import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {Dialog} from '../../../components/core/Dialog/Dialog';
import type {ColorTokens} from '../../../theme/tokens';

interface ThemePickerDialogProps {
  visible: boolean;
  onClose: () => void;
  themeMode: 'system' | 'dark' | 'light';
  onSelectTheme: (mode: 'system' | 'dark' | 'light') => void;
  colors: ColorTokens;
}

const THEMES: Array<'system' | 'dark' | 'light'> = ['system', 'dark', 'light'];

export const ThemePickerDialog: React.FC<ThemePickerDialogProps> = ({
  visible,
  onClose,
  themeMode,
  onSelectTheme,
  colors,
}) => {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Select Theme"
      message="Choose your preferred appearance">
      <View style={styles.row}>
        {THEMES.map(mode => {
          const isSelected = themeMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.btn,
                {
                  backgroundColor: isSelected
                    ? colors.accent.gold
                    : 'transparent',
                  borderWidth: 1,
                  borderColor: isSelected
                    ? colors.accent.gold
                    : colors.border.emphasis,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                onSelectTheme(mode);
                onClose();
              }}>
              <AppText
                variant="button"
                color={isSelected ? 'primary' : 'secondary'}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
