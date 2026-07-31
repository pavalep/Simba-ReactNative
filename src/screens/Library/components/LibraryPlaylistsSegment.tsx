import React from 'react';
import {StyleSheet, FlatList} from 'react-native';
import {PlaylistCard} from '../../../components/playlist/PlaylistCard/PlaylistCard';
import {Playlist} from '../../../types/playlist';
import {ColorTokens} from '../../../theme/tokens';

interface LibraryPlaylistsSegmentProps {
  playlists: Playlist[];
  colors: ColorTokens;
  onPlaylistCardPress: (playlistId: string) => void;
  onPlayAllPlaylist: (playlistId: string) => void;
  onShufflePlaylist: (playlistId: string) => void;
}

export const LibraryPlaylistsSegment: React.FC<LibraryPlaylistsSegmentProps> = React.memo(({
  playlists,
  onPlaylistCardPress,
  onPlayAllPlaylist,
  onShufflePlaylist,
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
        />
      )}
      scrollEnabled={false}
      initialNumToRender={playlists.length}
    />
  );
},
);
