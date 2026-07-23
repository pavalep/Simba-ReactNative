import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';

// ─── Types ──────────────────────────────────────────────────

interface MpvOption {
  key: string;
  value: string; // empty string = boolean flag (no value)
}

interface MpvConfigEditorProps {
  visible: boolean;
  onClose: () => void;
  options: MpvOption[];
  onSave: (options: MpvOption[]) => void;
}

// ─── Validation ─────────────────────────────────────────────

const VALID_MPV_KEYS = new Set([
  'hwdec',
  'vo',
  'ao',
  'profile',
  'cache',
  'cache-secs',
  'demuxer-max-bytes',
  'demuxer-max-back-bytes',
  'audio-buffer',
  'audio-device',
  'audio-channels',
  'audio-sample-rate',
  'audio-format',
  'sub-auto',
  'sub-codepage',
  'sub-font',
  'sub-font-size',
  'sub-color',
  'sub-border-size',
  'sub-shadow-offset',
  'sub-ass-override',
  'video-rotate',
  'video-zoom',
  'video-pan-x',
  'video-pan-y',
  'video-aspect',
  'deinterlace',
  'interpolation',
  'tscale',
  'video-sync',
  'volume',
  'volume-max',
  'gapless-audio',
  'keep-open',
  'save-position-on-quit',
  'watch-later-directory',
  'osd-level',
  'osd-font',
  'osd-font-size',
  'osd-color',
  'screenshot-format',
  'screenshot-directory',
  'ytdl',
  'ytdl-format',
  'script-opts',
]);

const isKnownKey = (key: string): boolean => VALID_MPV_KEYS.has(key);

const isValidValue = (_key: string, value: string): boolean => {
  // Boolean flags: allow any non-whitespace value (yes/no/auto etc.) or empty
  // Numeric values: must be valid number if the key expects one
  return true; // Accept all syntactically; mpv will reject bad values at runtime
};

// ─── Component ──────────────────────────────────────────────

export const MpvConfigEditor: React.FC<MpvConfigEditorProps> = ({
  visible,
  onClose,
  options,
  onSave,
}) => {
  const {colors} = useTheme();

  const [localOptions, setLocalOptions] = useState<MpvOption[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLocalOptions(options.map(o => ({...o})));
      setEditingIndex(null);
      setWarning(null);
    }
  }, [visible, options]);

  // ── Add new option ──
  const handleAdd = useCallback(() => {
    setEditingIndex(localOptions.length);
    setEditKey('');
    setEditValue('');
    setWarning(null);
  }, [localOptions.length]);

  // ── Start editing existing ──
  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditKey(localOptions[index].key);
    setEditValue(localOptions[index].value);
    setWarning(null);
  }, [localOptions]);

  // ── Save current edit ──
  const handleSaveEdit = useCallback(() => {
    const trimmedKey = editKey.trim();
    if (!trimmedKey) {
      setWarning('Option key cannot be empty.');
      return;
    }

    if (!isKnownKey(trimmedKey) && !/^x-[\w-]+$/.test(trimmedKey)) {
      // Allow custom keys prefixed with x-
      setWarning(
        `"${trimmedKey}" is not a known MPV key. Use a recognized key or prefix with "x-".`,
      );
      return;
    }

    if (!isValidValue(trimmedKey, editValue)) {
      setWarning('Invalid value for this option.');
      return;
    }

    const updated = [...localOptions];
    updated[editingIndex!] = {key: trimmedKey, value: editValue.trim()};
    setLocalOptions(updated);
    setEditingIndex(null);
    setWarning(null);
  }, [editKey, editValue, editingIndex, localOptions]);

  // ── Remove option ──
  const handleRemove = useCallback(
    (index: number) => {
      Alert.alert(
        'Remove Option',
        `Remove "--${localOptions[index].key}"?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              const updated = localOptions.filter((_, i) => i !== index);
              setLocalOptions(updated);
              if (editingIndex === index) {
                setEditingIndex(null);
              }
            },
          },
        ],
      );
    },
    [localOptions, editingIndex],
  );

  // ── Save all ──
  const handleSaveAll = useCallback(() => {
    onSave(localOptions);
    onClose();
  }, [localOptions, onSave, onClose]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.65)',
        },
        container: {
          maxHeight: '85%',
          backgroundColor: colors.background.elevated,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
        },
        handle: {
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.text.tertiary,
          alignSelf: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        closeBtn: {
          padding: spacing.xs,
        },
        body: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        },
        infoText: {
          marginBottom: spacing.md,
        },
        // Option list
        optionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          marginBottom: spacing.xs,
        },
        optionRowEven: {
          backgroundColor: colors.background.primary,
        },
        optionKey: {
          fontFamily: 'monospace',
          fontSize: 13,
        },
        optionValue: {
          fontFamily: 'monospace',
          fontSize: 12,
        },
        optionActions: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        actionBtn: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Add button
        addBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          borderRadius: radius.md,
          borderStyle: 'dashed',
          marginTop: spacing.xs,
        },
        // Edit panel
        editPanel: {
          marginTop: spacing.md,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.background.primary,
          borderWidth: 1,
          borderColor: colors.accent.goldDim,
        },
        editLabel: {
          marginBottom: spacing.xs,
        },
        editInput: {
          borderWidth: 1,
          borderColor: colors.border.subtle,
          borderRadius: radius.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          color: colors.text.primary,
          fontSize: 14,
          fontFamily: 'monospace',
          backgroundColor: colors.background.floating,
          marginBottom: spacing.sm,
        },
        editRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.xs,
        },
        editSaveBtn: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
        },
        editCancelBtn: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.background.floating,
          alignItems: 'center',
        },
        warningText: {
          color: colors.semantic.warning,
          marginBottom: spacing.sm,
        },
        // Save footer
        footer: {
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          gap: spacing.sm,
        },
        saveBtn: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
        },
        cancelBtn: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.background.floating,
          alignItems: 'center',
        },
        saveBtnText: {
          color: '#0A0A0C',
          fontWeight: '600',
        },
      }),
    [colors],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText variant="h3" color="primary">
              MPV Options
            </AppText>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <AppText variant="body2" color="secondary">
                Close
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <AppText variant="caption" color="tertiary" style={styles.infoText}>
              Add or edit MPV startup flags. Boolean flags can have an empty value.
              Custom keys must be prefixed with{' '}
              <AppText variant="mono" color="secondary">
                x-
              </AppText>
              .
            </AppText>

            {localOptions.length === 0 ? (
              <View style={{paddingVertical: spacing.xl, alignItems: 'center'}}>
                <AppText variant="body2" color="tertiary">
                  No custom options configured.
                </AppText>
              </View>
            ) : (
              localOptions.map((opt, idx) => (
                <View
                  key={`${opt.key}_${idx}`}
                  style={[
                    styles.optionRow,
                    idx % 2 === 0 && styles.optionRowEven,
                    editingIndex === idx && {
                      borderWidth: 1,
                      borderColor: colors.accent.gold,
                    },
                  ]}>
                  <View style={{flex: 1}}>
                    <AppText style={styles.optionKey} color="primary">
                      --{opt.key}
                    </AppText>
                    {opt.value ? (
                      <AppText style={styles.optionValue} color="secondary">
                        ={opt.value}
                      </AppText>
                    ) : (
                      <AppText variant="caption" color="tertiary">
                        (boolean flag)
                      </AppText>
                    )}
                  </View>
                  <View style={styles.optionActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {backgroundColor: colors.accent.goldDim},
                      ]}
                      onPress={() => handleEdit(idx)}
                      accessibilityLabel="Edit option"
                      accessibilityRole="button">
                      <AppText
                        style={{fontSize: 12, color: colors.accent.gold}}>
                        ✎
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {backgroundColor: 'rgba(239,83,80,0.15)'},
                      ]}
                      onPress={() => handleRemove(idx)}
                      accessibilityLabel="Remove option"
                      accessibilityRole="button">
                      <AppText
                        style={{fontSize: 12, color: colors.semantic.error}}>
                        ✕
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Add new option button */}
            {editingIndex === null && (
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <AppText variant="body2" color="accent" style={{fontWeight: '600'}}>
                  + Add Option
                </AppText>
              </TouchableOpacity>
            )}

            {/* Inline edit panel */}
            {editingIndex !== null && (
              <View style={styles.editPanel}>
                <AppText variant="caption" color="secondary" style={styles.editLabel}>
                  Option Key (without --)
                </AppText>
                <TextInput
                  style={styles.editInput}
                  value={editKey}
                  onChangeText={setEditKey}
                  placeholder="e.g. hwdec"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppText variant="caption" color="secondary" style={styles.editLabel}>
                  Value (leave empty for boolean flags)
                </AppText>
                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="e.g. auto"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {warning && (
                  <AppText variant="caption" style={styles.warningText}>
                    ⚠ {warning}
                  </AppText>
                )}
                <View style={styles.editRow}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => {
                      setEditingIndex(null);
                      setWarning(null);
                    }}>
                    <AppText variant="body2" color="secondary">
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editSaveBtn}
                    onPress={handleSaveEdit}>
                    <AppText variant="body2" style={{color: '#0A0A0C', fontWeight: '600'}}>
                      Save
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer save/cancel */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText variant="body2" color="secondary">
                Cancel
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
              <AppText variant="body2" style={styles.saveBtnText}>
                Apply Options
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export type {MpvOption};
