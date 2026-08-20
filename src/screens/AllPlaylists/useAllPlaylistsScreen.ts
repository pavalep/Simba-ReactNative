// ────────────────────────────────────────────────────────
// Simba Player — useAllPlaylistsScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {usePlaylists} from '../../features/playlists';
import type {Playlist} from '../../types/playlist';

export interface UseAllPlaylistsScreenResult {
  allPlaylists: Playlist[];
  handlePlaylistPress: (playlist: Playlist) => void;
  handleCreate: (name: string, kind: 'AUDIO_ONLY' | 'VIDEO_ONLY') => void;
  handleRename: (id: string, newName: string) => void;
  handleDelete: (id: string) => void;
}

export function useAllPlaylistsScreen(): UseAllPlaylistsScreenResult {
  const navigation = useNavigation<any>();
  const {
    playlists: allPlaylists,
    createPlaylist: create,
    renamePlaylist: rename,
    deletePlaylist: remove,
  } = usePlaylists();

  const handlePlaylistPress = useCallback(
    (playlist: Playlist) => {
      navigation.navigate('PlaylistDetail', {
        playlistId: playlist.id,
        playlistName: playlist.name,
      });
    },
    [navigation],
  );

  const handleCreate = useCallback(
    (name: string, kind: 'AUDIO_ONLY' | 'VIDEO_ONLY') => {
      create({name, kind});
    },
    [create],
  );

  const handleRename = useCallback(
    (id: string, newName: string) => {
      if (newName.trim()) {
        rename(id, newName.trim());
      }
    },
    [rename],
  );

  const handleDelete = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return {
    allPlaylists,
    handlePlaylistPress,
    handleCreate,
    handleRename,
    handleDelete,
  };
}
