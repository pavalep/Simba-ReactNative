import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {Dialog} from '../../../components/core/Dialog/Dialog';
import type {ColorTokens} from '../../../theme/tokens';

interface LinkedFoldersDialogProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (type: 'video' | 'audio') => void;
  colors: ColorTokens;
}

export const LinkedFoldersDialog: React.FC<LinkedFoldersDialogProps> = ({
  visible,
  onClose,
  onNavigate,
  colors,
}) => {
  useTheme();

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Linked Folders"
      message="Choose folder type to manage">
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, {backgroundColor: colors.accent.gold}]}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onNavigate('video');
          }}>
          <AppText variant="button" color="primary">
            Video Folders
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: colors.background.floating,
              borderWidth: 1,
              borderColor: colors.border.emphasis,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onNavigate('audio');
          }}>
          <AppText variant="button" color="accent">
            Audio Folders
          </AppText>
        </TouchableOpacity>
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
