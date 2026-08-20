import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {SvgIcon} from '../../utility/SvgIcon';
import {usePlaylists} from '../../../features/playlists';
import type {PlaylistKind} from '../../../features/playlists';

const KIND_OPTIONS: PlaylistKind[] = ['AUDIO_ONLY', 'VIDEO_ONLY'];
const KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
};

export interface PlaylistCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, kind: PlaylistKind) => void;
}

export const PlaylistCreateModal: React.FC<PlaylistCreateModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const {colors} = useTheme();
  const {playlists: existingPlaylists} = usePlaylists();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaylistKind>('AUDIO_ONLY');
  const [error, setError] = useState<string | null>(null);

  const existingNames = useMemo(
    () => new Set(existingPlaylists.map(p => p.name.toLowerCase())),
    [existingPlaylists],
  );

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();

    // Validate: non-empty
    if (!trimmed) {
      setError('Playlist name is required');
      return;
    }

    // Validate: max 100 chars
    if (trimmed.length > 100) {
      setError('Playlist name must be 100 characters or fewer');
      return;
    }

    // Validate: unique name
    if (existingNames.has(trimmed.toLowerCase())) {
      setError('A playlist with this name already exists');
      return;
    }

    setError(null);
    onCreate(trimmed, kind);
    setName('');
    setKind('AUDIO_ONLY');
  }, [name, kind, existingNames, onCreate]);

  const handleClose = useCallback(() => {
    setError(null);
    setName('');
    setKind('AUDIO_ONLY');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={[styles.overlay, {backgroundColor: colors.background.overlay}]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
          <AppText variant="h2" color="primary" style={styles.title}>New Playlist</AppText>
          <View style={styles.container}>
        {/* ── Name Input (53.3: AppTextInput with blur validation) ── */}
        <AppTextInput
          value={name}
          onChangeText={text => {
            setName(text);
            if (error) setError(null);
          }}
          placeholder="My Playlist"
          label="Name"
          maxLength={100}
          autoFocus
          error={error}
          validate={v => {
            const trimmed = v.trim();
            if (!trimmed) return 'Playlist name is required';
            if (trimmed.length > 100)
              return 'Playlist name must be 100 characters or fewer';
            if (existingNames.has(trimmed.toLowerCase()))
              return 'A playlist with this name already exists';
            return undefined;
          }}
        />

        {/* ── Kind Selector ── */}
        <AppText variant="caption" color="secondary" style={[styles.label, {marginTop: spacing.lg}]}>
          Type
        </AppText>
        {/* 59.1: virtualized kind chips */}
        <FlatList
          horizontal
          data={KIND_OPTIONS}
          keyExtractor={k => k}
          renderItem={({item: k}) => {
            const isActive = kind === k;
            return (
              <TouchableOpacity
                style={[
                  styles.kindChip,
                  {
                    backgroundColor: isActive ? colors.accent.goldDim : colors.background.floating,
                    borderColor: isActive ? colors.accent.gold : colors.border.subtle,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setKind(k)}
                accessibilityRole="button"
                accessibilityState={{selected: isActive}}
                accessibilityLabel={`${KIND_LABELS[k]} playlist type`}>
                <SvgIcon
                  name={k === 'AUDIO_ONLY' ? 'music' : k === 'VIDEO_ONLY' ? 'video' : 'listMusic'}
                  size={16}
                  color={isActive ? colors.accent.gold : colors.text.secondary}
                  style={{marginRight: 6}}
                />
                <AppText
                  variant="body2"
                  style={{color: isActive ? colors.accent.gold : colors.text.secondary}}>
                  {KIND_LABELS[k]}
                </AppText>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.kindRow}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={KIND_OPTIONS.length}
        />

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.createBtn, {backgroundColor: colors.accent.gold}]}
            activeOpacity={0.8}
            onPress={handleCreate}
            accessibilityRole="button">
            <AppText variant="body2" style={{color: colors.text.inverse, fontWeight: '600'}}>
              Create
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, {borderColor: colors.border.subtle}]}
            activeOpacity={0.7}
            onPress={handleClose}
            accessibilityRole="button">
            <AppText variant="body2" color="secondary">
              Cancel
            </AppText>
          </TouchableOpacity>
        </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingTop: spacing.lg,
    overflow: 'hidden',
  },
  title: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  container: {
    padding: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kindChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl + 4,
  },
  createBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
