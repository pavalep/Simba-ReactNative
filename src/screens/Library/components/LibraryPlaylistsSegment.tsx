import React from 'react';
import {View, StyleSheet} from 'react-native';
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

export const LibraryPlaylistsSegment: React.FC<LibraryPlaylistsSegmentProps> = ({
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
    <View style={styles.playlistGrid}>
      {playlists.map(pl => (
        <PlaylistCard
          key={pl.id}
          playlist={pl}
          onPress={onPlaylistCardPress}
          onPlayAll={onPlayAllPlaylist}
          onShuffleAll={onShufflePlaylist}
        />
      ))}
    </View>
  );
};
