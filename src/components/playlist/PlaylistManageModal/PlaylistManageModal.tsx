import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';

export interface PlaylistManageModalProps {
  visible: boolean;
  mode: 'rename' | 'delete';
  currentName: string;
  onConfirm: (result: string | boolean) => void;
  onCancel: () => void;
}

export const PlaylistManageModal: React.FC<PlaylistManageModalProps> = ({
  visible,
  mode,
  currentName,
  onConfirm,
  onCancel,
}) => {
  const {colors} = useTheme();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (visible) setName(currentName);
  }, [currentName, visible]);

  const isRename = mode === 'rename';
  const submit = () => {
    if (isRename) {
      const trimmed = name.trim();
      if (trimmed) onConfirm(trimmed);
      return;
    }
    onConfirm(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, {backgroundColor: colors.background.overlay}]}> 
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.card, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}> 
          <AppText variant="h2" color="primary">
            {isRename ? 'Rename Playlist' : 'Delete Playlist'}
          </AppText>
          {isRename ? (
            <AppTextInput value={name} onChangeText={setName} label="Name" autoFocus />
          ) : (
            <AppText variant="body1" color="secondary" style={styles.message}>
              Delete “{currentName}”? This playlist and its items will be removed.
            </AppText>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.secondaryButton, {borderColor: colors.border.subtle}]} onPress={onCancel}>
              <AppText variant="body2" color="secondary">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, {backgroundColor: isRename ? colors.accent.gold : colors.semantic.error}]} onPress={submit}>
              <AppText variant="body2" style={{color: colors.text.inverse, fontWeight: '600'}}>
                {isRename ? 'Save' : 'Delete'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  card: {width: '100%', maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md},
  message: {lineHeight: 22},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm},
  secondaryButton: {minHeight: 44, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md},
  primaryButton: {minHeight: 44, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md},
});

export default PlaylistManageModal;

