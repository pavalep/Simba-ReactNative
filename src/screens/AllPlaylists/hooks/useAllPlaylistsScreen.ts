// ────────────────────────────────────────────────────────
// Simba Player — useAllPlaylistsScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {usePlaylists} from '../../../features/playlists';
import type {Playlist, PlaylistKind} from '../../../types/playlist';

export interface UseAllPlaylistsScreenResult {
  allPlaylists: Playlist[];
  handlePlaylistPress: (playlist: Playlist) => void;
  // The kind is the facade's kind, not a two-value subset of it: the screen
  // opens `PlaylistCreateModal`, which offers `MIXED` as well, and a
  // narrower signature here would silently drop that kind.
  handleCreate: (name: string, kind: PlaylistKind) => void;
  handleRename: (id: string, newName: string) => void;
  handleDelete: (id: string) => void;
  // The pin ACTION (D-P8). This is the MANAGEMENT page, so the pin is
  // reachable without a long-press: a long-press is not reachable by a
  // screen reader or a keyboard, and a pin that can only be reached by a
  // gesture is a pin some users cannot use.
  handleTogglePin: (id: string, pinned: boolean) => void;
}

export function useAllPlaylistsScreen(): UseAllPlaylistsScreenResult {
  const navigation = useNavigation<any>();
  const {
    playlists: allPlaylists,
    createPlaylist: create,
    renamePlaylist: rename,
    deletePlaylist: remove,
    setPinned,
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
    (name: string, kind: PlaylistKind) => {
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

  const handleTogglePin = useCallback(
    (id: string, pinned: boolean) => {
      setPinned(id, pinned);
    },
    [setPinned],
  );

  return {
    allPlaylists,
    handlePlaylistPress,
    handleCreate,
    handleRename,
    handleDelete,
    handleTogglePin,
  };
}
