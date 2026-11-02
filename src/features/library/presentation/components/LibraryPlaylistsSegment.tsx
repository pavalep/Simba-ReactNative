import React from 'react';
import {StyleSheet, FlatList} from 'react-native';
import {PlaylistCard} from '../../../../components/playlist/PlaylistCard/PlaylistCard';
import {Playlist} from '../../../../types/playlist';

interface LibraryPlaylistsSegmentProps {
  playlists: Playlist[];
  onPlaylistCardPress: (playlistId: string) => void;
  onPlayAllPlaylist: (playlistId: string) => void;
  onShufflePlaylist: (playlistId: string) => void;
  /**
   * Long-press opens the playlist's action menu.
   *
   * The Library is a BROWSING surface, so the card carries no permanent
   * pin button — a long-press is the shortcut here, and the management row
   * is the reachable door (D-P8, spec §4.5).
   */
  onPlaylistCardLongPress?: (playlistId: string) => void;
}

export const LibraryPlaylistsSegment: React.FC<LibraryPlaylistsSegmentProps> = React.memo(({
  playlists,
  onPlaylistCardPress,
  onPlayAllPlaylist,
  onShufflePlaylist,
  onPlaylistCardLongPress,
}) => {

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        playlistGrid: {
          gap: 16,
        },
      }),
    [],
  );

  return (
    /* 59.1: virtualized playlist rows (linear column) */
    <FlatList
      data={playlists}
      keyExtractor={pl => pl.id}
      contentContainerStyle={styles.playlistGrid}
      renderItem={({item: pl}) => (
        <PlaylistCard
          playlist={pl}
          onPress={onPlaylistCardPress}
          onPlayAll={onPlayAllPlaylist}
          onShuffleAll={onShufflePlaylist}
          onLongPress={onPlaylistCardLongPress}
        />
      )}
      scrollEnabled={false}
      initialNumToRender={playlists.length}
    />
  );
},
);
