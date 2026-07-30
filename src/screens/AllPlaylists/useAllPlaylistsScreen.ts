// ────────────────────────────────────────────────────────
// Simba Player — useAllPlaylistsScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../store';
import {selectAllPlaylists, createPlaylist, renamePlaylist, deletePlaylist} from '../../store/slices/playlistSlice';
import type {Playlist} from '../../types/playlist';

export interface UseAllPlaylistsScreenResult {
  allPlaylists: Playlist[];
  handlePlaylistPress: (playlist: Playlist) => void;
  handleCreate: (name: string, kind: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED') => void;
  handleRename: (id: string, newName: string) => void;
  handleDelete: (id: string) => void;
}

export function useAllPlaylistsScreen(): UseAllPlaylistsScreenResult {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const allPlaylists = useAppSelector(selectAllPlaylists);

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
    (name: string, kind: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED') => {
      dispatch(createPlaylist({name, kind}));
    },
    [dispatch],
  );

  const handleRename = useCallback(
    (id: string, newName: string) => {
      if (newName.trim()) {
        dispatch(renamePlaylist({id, newName: newName.trim()}));
      }
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (id: string) => {
      dispatch(deletePlaylist(id));
    },
    [dispatch],
  );

  return {
    allPlaylists,
    handlePlaylistPress,
    handleCreate,
    handleRename,
    handleDelete,
  };
}
