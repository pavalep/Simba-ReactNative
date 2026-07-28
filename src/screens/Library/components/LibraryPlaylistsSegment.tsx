import React from 'react';
import {View, StyleSheet} from 'react-native';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {PlaylistCard} from '../../../components/playlist/PlaylistCard/PlaylistCard';
import {Playlist, PlaylistKind} from '../../../types/playlist';
import {ColorTokens} from '../../../theme/tokens';

// ── Dummy data for empty library ──
const DUMMY_PLAYLISTS = [
  {
    id: 'p1',
    name: 'Late Night Chill',
    count: 12,
    kind: 'AUDIO_ONLY' as PlaylistKind,
    seed: 'simba1',
  },
  {
    id: 'p2',
    name: 'Epic Soundtracks',
    count: 45,
    kind: 'AUDIO_ONLY' as PlaylistKind,
    seed: 'simba2',
  },
  {
    id: 'p3',
    name: 'Sci-Fi Collection',
    count: 8,
    kind: 'VIDEO_ONLY' as PlaylistKind,
    seed: 'simba3',
  },
  {
    id: 'p4',
    name: 'Travel Gems',
    count: 24,
    kind: 'AUDIO_ONLY' as PlaylistKind,
    seed: 'simba4',
  },
];

interface LibraryPlaylistsSegmentProps {
  playlists: Playlist[];
  colors: ColorTokens;
  onPlaylistCardPress: (playlistId: string) => void;
  onPlayAllPlaylist: (playlistId: string) => void;
  onShufflePlaylist: (playlistId: string) => void;
}

export const LibraryPlaylistsSegment: React.FC<LibraryPlaylistsSegmentProps> = ({
  playlists: realPlaylists,
  onPlaylistCardPress,
  onPlayAllPlaylist,
  onShufflePlaylist,
}) => {
  const playlists = React.useMemo(() => {
    if (realPlaylists.length > 0) return realPlaylists;
    return DUMMY_PLAYLISTS.map(p => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      items: Array.from({length: p.count}, (_, i) => ({
        id: `${p.id}-item-${i}`,
        thumbnailPath: `https://picsum.photos/seed/${p.seed}${i}/400/400`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any));
  }, [realPlaylists]);

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
