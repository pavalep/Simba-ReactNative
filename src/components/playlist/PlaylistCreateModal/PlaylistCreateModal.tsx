import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import type {PlaylistKind} from '../../../types/playlist';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import {useAppSelector} from '../../../store';

const KIND_OPTIONS: PlaylistKind[] = ['AUDIO_ONLY', 'VIDEO_ONLY', 'MIXED'];
const KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
  MIXED: 'Mixed',
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
  const existingPlaylists = useAppSelector(selectAllPlaylists);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaylistKind>('MIXED');
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
    setKind('MIXED');
  }, [name, kind, existingNames, onCreate]);

  const handleClose = useCallback(() => {
    setError(null);
    setName('');
    setKind('MIXED');
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={['55%']}
      dismissable
      title="New Playlist">
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
        <View style={styles.kindRow}>
          {KIND_OPTIONS.map(k => {
            const isActive = kind === k;
            return (
              <TouchableOpacity
                key={k}
                style={[
                  styles.kindChip,
                  {
                    backgroundColor: isActive ? colors.accent.goldDim : colors.background.floating,
                    borderColor: isActive ? colors.accent.gold : colors.border.subtle,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setKind(k)}>
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
          })}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.createBtn, {backgroundColor: colors.accent.gold}]}
            activeOpacity={0.8}
            onPress={handleCreate}>
            <AppText variant="body2" style={{color: '#08080A', fontWeight: '600'}}>
              Create
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, {borderColor: colors.border.subtle}]}
            activeOpacity={0.7}
            onPress={handleClose}>
            <AppText variant="body2" color="secondary">
              Cancel
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
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
