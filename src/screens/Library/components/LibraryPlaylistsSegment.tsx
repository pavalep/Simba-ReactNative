import React from 'react';
import {View, StyleSheet} from 'react-native';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {PlaylistCard} from '../../../components/playlist/PlaylistCard/PlaylistCard';

interface LibraryPlaylistsSegmentProps {
  playlists: any[];
  colors: any;
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
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
        },
      }),
    [],
  );

  if (playlists.length === 0) {
    return (
      <EmptyState
        icon="listMusic"
        title="No playlists yet"
        description="Playlists let you group your favourite media together. Tap the + button to create your first playlist."
      />
    );
  }

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
