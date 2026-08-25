import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Button} from './VideoV2Button';

type Props = Pick<VideoV2Model, 'colors' | 'playlists' | 'title'> & {
  visible: boolean;
  onClose: () => void;
  onSelect: (playlistId: string) => void;
  onCreate: (name: string) => void;
};

export const VideoV2PlaylistSheet: React.FC<Props> = ({colors, playlists, title, visible, onClose, onSelect, onCreate}) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const close = () => { setCreating(false); setName(''); onClose(); };
  const create = () => {
    const value = name.trim();
    if (!value) return;
    onCreate(value);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close playlist picker" />
        <View style={[styles.sheet, {backgroundColor: colors.background.scrimStrong, borderColor: colors.border.emphasis}]}>
          <View style={styles.header}>
            <View style={styles.headingCopy}><Text style={[styles.title, {color: colors.text.bright}]}>Add to playlist</Text><Text style={[styles.subtitle, {color: colors.text.secondary}]} numberOfLines={1}>{title}</Text></View>
            <VideoV2Button icon="close" label="Close playlist picker" onPress={close} color={colors.text.bright} size={40} />
          </View>
          {creating ? <View style={styles.form}>
            <Text style={[styles.label, {color: colors.text.secondary}]}>New video playlist</Text>
            <TextInput autoFocus value={name} onChangeText={setName} placeholder="Playlist name" placeholderTextColor={colors.text.tertiary} selectionColor={colors.accent.gold} style={[styles.input, {color: colors.text.bright, borderColor: colors.border.emphasis}]} returnKeyType="done" onSubmitEditing={create} />
            <View style={styles.formActions}><Pressable accessibilityRole="button" accessibilityLabel="Cancel playlist creation" onPress={() => {setCreating(false); setName('');}} style={styles.textAction}><Text style={[styles.actionText, {color: colors.text.secondary}]}>Cancel</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Create video playlist" disabled={!name.trim()} onPress={create} style={[styles.createAction, {backgroundColor: name.trim() ? colors.accent.gold : colors.background.highlightStrong}]}><Text style={[styles.actionText, {color: name.trim() ? colors.background.primary : colors.text.tertiary}]}>Create</Text></Pressable></View>
          </View> : <>
            {playlists.length === 0 ? <View style={styles.empty}><Text style={[styles.emptyTitle, {color: colors.text.bright}]}>No video playlists yet</Text><Text style={[styles.emptyBody, {color: colors.text.secondary}]}>Create one to save this video for later.</Text></View> : playlists.map(playlist => <Pressable key={playlist.id} accessibilityRole="button" accessibilityLabel={`Add to ${playlist.name}`} onPress={() => {onSelect(playlist.id); close();}} style={({pressed}) => [styles.playlistRow, pressed && styles.pressed]}><View style={styles.playlistCopy}><Text style={[styles.playlistName, {color: colors.text.bright}]} numberOfLines={1}>{playlist.name}</Text><Text style={[styles.playlistMeta, {color: colors.text.secondary}]}>{playlist.items.length} {playlist.items.length === 1 ? 'video' : 'videos'}</Text></View><Text style={[styles.chevron, {color: colors.text.secondary}]}>›</Text></Pressable>)}
            <Pressable accessibilityRole="button" accessibilityLabel="Create a new video playlist" onPress={() => setCreating(true)} style={({pressed}) => [styles.newRow, pressed && styles.pressed]}><Text style={[styles.plus, {color: colors.accent.gold}]}>＋</Text><Text style={[styles.newLabel, {color: colors.accent.gold}]}>New video playlist</Text></Pressable>
          </>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 18, paddingBottom: 28},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  headingCopy: {flex: 1, minWidth: 0, marginRight: 8},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {fontSize: 12, marginTop: 3},
  playlistRow: {minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent'},
  playlistCopy: {flex: 1, minWidth: 0},
  playlistName: {fontSize: 15, fontWeight: '700'},
  playlistMeta: {fontSize: 12, marginTop: 3},
  chevron: {fontSize: 25, fontWeight: '300'},
  newRow: {minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10},
  plus: {fontSize: 26, lineHeight: 28},
  newLabel: {fontSize: 15, fontWeight: '800'},
  empty: {paddingVertical: 22},
  emptyTitle: {fontSize: 15, fontWeight: '800'},
  emptyBody: {fontSize: 13, marginTop: 6},
  form: {paddingVertical: 8},
  label: {fontSize: 12, fontWeight: '700', marginBottom: 8},
  input: {height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15},
  formActions: {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14},
  textAction: {paddingHorizontal: 14, paddingVertical: 10},
  createAction: {paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18},
  actionText: {fontSize: 14, fontWeight: '800'},
  pressed: {opacity: 0.68},
});
