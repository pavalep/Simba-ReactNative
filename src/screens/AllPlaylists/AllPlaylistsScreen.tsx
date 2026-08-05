// ────────────────────────────────────────────────────────
// Simba Player — AllPlaylistsScreen (Phase 20)
// ────────────────────────────────────────────────────────

import React, {useCallback, useState} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {AppText} from '../../components/core/AppText/AppText';
import {AppButton} from '../../components/core/AppButton/AppButton';
import {AppTextInput} from '../../components/core/AppTextInput/AppTextInput';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useAllPlaylistsScreen} from './useAllPlaylistsScreen';
import type {PlaylistKind} from '../../types/playlist';

export const AllPlaylistsScreen: React.FC = () => {
  const {colors} = useTheme();
  const {allPlaylists, handlePlaylistPress, handleCreate, handleRename, handleDelete} =
    useAllPlaylistsScreen();

  const {confirm: confirmDelete, dialog: deleteDialog} = useConfirmDialog();

  // ── Create Modal State ──
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createKind, setCreateKind] = useState<PlaylistKind>('AUDIO_ONLY');

  // ── Rename Modal State ──
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameName, setRenameName] = useState('');

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(allPlaylists.length, 12),
    {staggerDelay: 50, direction: 'up', duration: 300},
  );

  const handleCreateSubmit = useCallback(() => {
    if (createName.trim()) {
      handleCreate(createName.trim(), createKind);
      setCreateVisible(false);
      setCreateName('');
    }
  }, [createName, createKind, handleCreate]);

  const handleStartRename = useCallback(
    (id: string, currentName: string) => {
      setRenameId(id);
      setRenameName(currentName);
      setRenameVisible(true);
    },
    [],
  );

  const handleRenameSubmit = useCallback(() => {
    handleRename(renameId, renameName);
    setRenameVisible(false);
    setRenameName('');
  }, [renameId, renameName, handleRename]);

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      const confirmed = await confirmDelete({
        title: 'Delete Playlist',
        message: 'Are you sure you want to delete this playlist? This action cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (confirmed) {
        handleDelete(id);
      }
    },
    [confirmDelete, handleDelete],
  );

  const renderItem = ({item, index}: {item: typeof allPlaylists[number]; index: number}) => (
    <TouchableOpacity
      style={[
        styles.playlistItem,
        {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
        animStyles[index] || {},
      ]}
      activeOpacity={0.7}
      onPress={() => handlePlaylistPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open playlist ${item.name}`}>
      <View style={[styles.iconBox, {backgroundColor: colors.accent.goldDim}]}>
        <SvgIcon name="listMusic" size={22} color={colors.accent.gold} />
      </View>
      <View style={styles.playlistInfo}>
        <AppText variant="body2" color="primary" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="caption" color="tertiary">
          {item.items.length} {item.items.length === 1 ? 'item' : 'items'} ·{' '}
          {item.kind === 'AUDIO_ONLY'
            ? 'Audio'
            : item.kind === 'VIDEO_ONLY'
            ? 'Video'
            : 'Mixed'}
        </AppText>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, {backgroundColor: colors.border.subtle}]}
        onPress={() => handleStartRename(item.id, item.name)}
        activeOpacity={0.7}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityRole="button"
        accessibilityLabel={`Rename playlist ${item.name}`}>
        <SvgIcon name="sliders" size={14} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, {backgroundColor: colors.semantic.error + '20'}]}
        onPress={() => handleDeleteConfirm(item.id)}
        activeOpacity={0.7}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityRole="button"
        accessibilityLabel={`Delete playlist ${item.name}`}>
        <SvgIcon name="close" size={14} color={colors.semantic.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {deleteDialog}
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="h2" color="primary" style={{flex: 1}}>
          All Playlists
        </AppText>
        <AppButton
          title="Create"
          variant="primary"
          size="sm"
          onPress={() => setCreateVisible(true)}
        />
      </View>

      {/* ── Content ── */}
      {allPlaylists.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="listMusic"
            title="No Playlists"
            description="Create your first playlist to organize your media."
            actionLabel="Create Playlist"
            onAction={() => setCreateVisible(true)}
          />
        </View>
      ) : (
        <FlatList
          data={allPlaylists}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      )}

      {/* ── Create Modal ── */}
      <Modal
        visible={createVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateVisible(false)}>
        <View style={[styles.modalOverlay, {backgroundColor: colors.background.floating}]}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: colors.background.elevated},
            ]}>
            <AppText variant="h3" color="primary" style={{marginBottom: spacing.md}}>
              New Playlist
            </AppText>

            <AppTextInput
              value={createName}
              onChangeText={setCreateName}
              placeholder="Playlist name"
              autoFocus
              clearable
              validate={v =>
                v.trim() ? undefined : 'Enter a playlist name.'
              }
              containerStyle={styles.modalInput}
            />

            {/* Kind selector (59.1: virtualized) */}
            <FlatList
              horizontal
              data={['AUDIO_ONLY', 'VIDEO_ONLY', 'MIXED'] as PlaylistKind[]}
              keyExtractor={k => k}
              renderItem={({item: k}) => (
                <TouchableOpacity
                  style={[
                    styles.kindChip,
                    {
                      backgroundColor:
                        createKind === k
                          ? colors.accent.gold
                          : colors.background.floating,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  onPress={() => setCreateKind(k)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{selected: createKind === k}}
                  accessibilityLabel={`${k === 'AUDIO_ONLY' ? 'Audio' : k === 'VIDEO_ONLY' ? 'Video' : 'Mixed'} playlist type`}>
                  <AppText
                    variant="caption"
                    color={createKind === k ? 'onGold' : 'secondary'}>
                    {k === 'AUDIO_ONLY' ? 'Audio' : k === 'VIDEO_ONLY' ? 'Video' : 'Mixed'}
                  </AppText>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.kindRow}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              initialNumToRender={3}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="text"
                size="sm"
                onPress={() => {
                  setCreateVisible(false);
                  setCreateName('');
                }}
              />
              <AppButton
                title="Create"
                variant="primary"
                size="sm"
                onPress={handleCreateSubmit}
                disabled={!createName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Rename Modal ── */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}>
        <View style={[styles.modalOverlay, {backgroundColor: colors.background.floating}]}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: colors.background.elevated},
            ]}>
            <AppText variant="h3" color="primary" style={{marginBottom: spacing.md}}>
              Rename Playlist
            </AppText>

            <AppTextInput
              value={renameName}
              onChangeText={setRenameName}
              placeholder="New name"
              autoFocus
              clearable
              validate={v =>
                v.trim() ? undefined : 'Enter a playlist name.'
              }
              containerStyle={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="text"
                size="sm"
                onPress={() => {
                  setRenameVisible(false);
                  setRenameName('');
                }}
              />
              <AppButton
                title="Save"
                variant="primary"
                size="sm"
                onPress={handleRenameSubmit}
                disabled={!renameName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    padding: spacing.xxl,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kindChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});