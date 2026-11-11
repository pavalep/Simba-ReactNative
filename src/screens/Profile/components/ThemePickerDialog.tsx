import React from 'react';
import {TouchableOpacity, StyleSheet, FlatList} from 'react-native';
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
      {/* 59.1: virtualized theme options */}
      <FlatList
        horizontal
        data={THEMES}
        keyExtractor={mode => mode}
        renderItem={({item: mode}) => {
          const isSelected = themeMode === mode;
          return (
            <TouchableOpacity
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
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              accessibilityLabel={`${mode.charAt(0).toUpperCase() + mode.slice(1)} theme`}
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
        }}
        contentContainerStyle={[styles.row, styles.rowGrow]}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        initialNumToRender={THEMES.length}
      />
    </Dialog>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rowGrow: {
    flexGrow: 1,
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
