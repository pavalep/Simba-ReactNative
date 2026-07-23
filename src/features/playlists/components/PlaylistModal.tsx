import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {PlaylistKind} from '../../../types/playlist';

// ─── Modes ──────────────────────────────────────────────────

type ModalMode = 'create' | 'rename' | 'delete';

interface PlaylistModalProps {
  visible: boolean;
  mode: ModalMode;
  /** Current playlist name (for rename/delete) */
  currentName?: string;
  /** Called with the result. For create/rename: the new name. For delete: true/false. */
  onConfirm: (result: string | boolean) => void;
  onCancel: () => void;
}

// ─── Kind selector ──────────────────────────────────────────

const KIND_OPTIONS: {key: PlaylistKind; label: string}[] = [
  {key: 'AUDIO_ONLY', label: 'Audio Only'},
  {key: 'VIDEO_ONLY', label: 'Video Only'},
  {key: 'MIXED', label: 'Mixed'},
];

// ─── Component ──────────────────────────────────────────────

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  visible,
  mode,
  currentName = '',
  onConfirm,
  onCancel,
}) => {
  const {colors, isDark} = useTheme();

  const [nameInput, setNameInput] = useState('');
  const [selectedKind, setSelectedKind] = useState<PlaylistKind>('MIXED');
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setNameInput(mode === 'rename' ? currentName : '');
      setSelectedKind('MIXED');
      setError(null);
    }
  }, [visible, mode, currentName]);

  // ── Confirm handler ──
  const handleConfirm = useCallback(() => {
    if (mode === 'delete') {
      onConfirm(true);
      return;
    }

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('Playlist name cannot be empty.');
      return;
    }
    if (trimmed.length > 100) {
      setError('Playlist name is too long (max 100 characters).');
      return;
    }

    if (mode === 'create') {
      // Pass both name and kind as a JSON string; consumer will parse it
      onConfirm(JSON.stringify({name: trimmed, kind: selectedKind}));
    } else {
      onConfirm(trimmed);
    }
  }, [mode, nameInput, selectedKind, onConfirm]);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.65)',
        },
        container: {
          width: '85%',
          maxWidth: 400,
          borderRadius: radius.lg,
          backgroundColor: colors.background.elevated,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
        },
        title: {
          marginBottom: spacing.xs,
          textAlign: 'center',
        },
        subtitle: {
          marginBottom: spacing.lg,
          textAlign: 'center',
        },
        // Name input (create/rename)
        input: {
          borderWidth: 1,
          borderColor: error ? colors.semantic.error : colors.border.subtle,
          borderRadius: radius.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          color: colors.text.primary,
          fontSize: 15,
          backgroundColor: colors.background.floating,
          marginBottom: spacing.sm,
        },
        errorText: {
          color: colors.semantic.error,
          marginBottom: spacing.sm,
        },
        // Kind selector (create only)
        kindLabel: {
          marginBottom: spacing.sm,
          marginTop: spacing.sm,
        },
        kindOptions: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        },
        kindChip: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          alignItems: 'center',
          borderWidth: 1,
        },
        kindChipActive: {
          backgroundColor: colors.accent.goldDim,
          borderColor: colors.accent.gold,
        },
        kindChipInactive: {
          backgroundColor: colors.background.primary,
          borderColor: colors.border.subtle,
        },
        kindChipTextActive: {
          color: colors.accent.gold,
        },
        kindChipTextInactive: {
          color: colors.text.secondary,
        },
        // Delete confirmation
        deleteInfo: {
          marginBottom: spacing.lg,
          textAlign: 'center',
        },
        deleteName: {
          marginTop: spacing.xs,
          marginBottom: spacing.lg,
          textAlign: 'center',
        },
        // Actions
        actions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: spacing.sm,
        },
        cancelBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
          backgroundColor: colors.background.floating,
        },
        confirmBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
        },
        confirmTypical: {
          backgroundColor: colors.accent.gold,
        },
        confirmDanger: {
          backgroundColor: colors.semantic.error,
        },
        confirmBtnText: {
          fontWeight: '600',
        },
        confirmBtnTextGold: {
          color: '#0A0A0C',
        },
        confirmBtnTextDanger: {
          color: '#FFFFFF',
        },
      }),
    [colors, error, isDark],
  );

  // ── Render ──
  const isDelete = mode === 'delete';
  const isCreate = mode === 'create';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View style={styles.container}>
          {/* Title */}
          <AppText variant="h3" color="primary" style={styles.title}>
            {mode === 'create'
              ? 'New Playlist'
              : mode === 'rename'
              ? 'Rename Playlist'
              : 'Delete Playlist'}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.subtitle}>
            {isDelete
              ? 'This action cannot be undone.'
              : isCreate
              ? 'Create a new playlist to organise your media.'
              : 'Enter a new name for this playlist.'}
          </AppText>

          {/* ── Delete Confirmation ── */}
          {isDelete && (
            <>
              <AppText variant="body2" color="primary" style={styles.deleteInfo}>
                Are you sure you want to delete
              </AppText>
              <AppText
                variant="h3"
                color="accent"
                style={styles.deleteName}>
                "{currentName}"
              </AppText>
            </>
          )}

          {/* ── Name Input (create/rename) ── */}
          {!isDelete && (
            <>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={v => {
                  setNameInput(v);
                  setError(null);
                }}
                placeholder={
                  isCreate ? 'My Playlist' : 'New playlist name'
                }
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                autoCapitalize="sentences"
                maxLength={100}
              />
              {error && (
                <AppText variant="caption" style={styles.errorText}>
                  {error}
                </AppText>
              )}
            </>
          )}

          {/* ── Kind Selector (create only) ── */}
          {isCreate && (
            <>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.kindLabel}>
                Playlist Type
              </AppText>
              <View style={styles.kindOptions}>
                {KIND_OPTIONS.map(kind => (
                  <TouchableOpacity
                    key={kind.key}
                    style={[
                      styles.kindChip,
                      selectedKind === kind.key
                        ? styles.kindChipActive
                        : styles.kindChipInactive,
                    ]}
                    onPress={() => setSelectedKind(kind.key)}>
                    <AppText
                      variant="caption"
                      style={
                        selectedKind === kind.key
                          ? styles.kindChipTextActive
                          : styles.kindChipTextInactive
                      }>
                      {kind.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <AppText variant="body2" color="secondary">
                Cancel
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                isDelete ? styles.confirmDanger : styles.confirmTypical,
              ]}
              onPress={handleConfirm}>
              <AppText
                variant="body2"
                style={[
                  styles.confirmBtnText,
                  isDelete
                    ? styles.confirmBtnTextDanger
                    : styles.confirmBtnTextGold,
                ]}>
                {isDelete
                  ? 'Delete'
                  : isCreate
                  ? 'Create'
                  : 'Rename'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export type {ModalMode, PlaylistModalProps};
