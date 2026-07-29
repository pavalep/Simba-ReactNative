import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import SeekBar from '../../components/player/SeekBar/SeekBar';
import AudioVisualizer from '../../components/player/AudioVisualizer/AudioVisualizer';
import LyricsQueuePanel from './components/LyricsQueuePanel';
import {AlbumArtBackground} from './components/AlbumArtBackground';
import {AudioPlayerHeader} from './components/AudioPlayerHeader';
import {PlayerErrorFallback} from '../../components/feedback/PlayerErrorFallback';
import {AudioAlbumArt} from './components/AudioAlbumArt';
import {AudioTrackInfo} from './components/AudioTrackInfo';
import {AudioTransportControls} from './components/AudioTransportControls';
import {AudioVolumeControl} from './components/AudioVolumeControl';
import {AudioActionButtons} from './components/AudioActionButtons';
import {InfoSheet} from '../../components/player/NowPlayingInfo/InfoSheet';
import type {Chapter} from '../../components/player/NowPlayingInfo/ChapterList';
import {PlaylistPreviewSheet} from '../../components/player/PlaylistPreview/PlaylistPreviewSheet';
import {QueueSheet} from '../../components/sheets/QueueSheet/QueueSheet';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet';
import {MpvPlayer} from '../../native';
import {RootStackScreenProps} from '../../navigation/types';
import {TransportProvider, useTransport} from '../../contexts/TransportContext';
import {useAppDispatch} from '../../store';
import {playFromPlaylist} from '../../store/slices/playerSlice';
import type {TrackMetadata} from '../../services/metadataService';
import type {LrcLine} from '../../utils/lrcParser';
import type {PlaylistEntry} from '../../store/slices/playerSlice';
import {useAudioPlayerScreen} from './hooks/useAudioPlayerScreen';

type Props = RootStackScreenProps<'AudioPlayer'>;

export const AudioPlayerScreen: React.FC<Props> = ({navigation, route}) => {
  return (
    <TransportProvider isReady={false} enabled={true}>
      <AudioPlayerScreenInner navigation={navigation} route={route} />
    </TransportProvider>
  );
};

const AudioPlayerScreenInner: React.FC<Props> = ({navigation, route}) => {
  const {
    colors, isDark, insets, dispatch,
    title, fileUri,
    isLoading, isReady, error, errorIsPermission, refreshing,
    volume, metadata, chapters, lyrics,
    infoSheetVisible, playlistSheetVisible, userPlaylistSheetVisible,
    queueSheetVisible, queueMultiSelect, isPlaying,
    relatedTracks,
    playlist, queue, currentFile, currentIndex,
    loopMode, shuffle, playbackHistory, selectedQueueIndices,
    setInfoSheetVisible, setPlaylistSheetVisible, setUserPlaylistSheetVisible,
    setQueueSheetVisible, setQueueMultiSelect, setChapters, setError,
    setIsLoading, setRefreshing, setIsPlaying,
    onRefresh,
    handleGoBack, handlePlayPause, handlePrev, handleNext,
    handleSeek, handleVolumeChange, handleSeekToLyric,
    handleToggleShuffle, handleToggleLoop,
    handleAddToPlaylist, handleRemoveFromPlaylist, handlePlayFromPlaylist,
    handleQueueMoveItem, handleQueueRemoveItem, handleQueueSelectItem,
    handleSelectQueueItem, handleSelectHistoryItem,
    handlePlayNext, handleAddToQueue,
    handleEnterMultiSelect, handleExitMultiSelect, handleToggleSelection,
    handleRemoveSelected, handleMoveSelectedToTop, handleClearAll,
    handleInfoAddToPlaylist, handlePlayRelatedTrack,
    handleRetry,
  } = useAudioPlayerScreen(navigation, route);

  const mappedLoopMode: 'off' | 'all' | 'one' =
    loopMode === 'none' ? 'off' : loopMode === 'file' ? 'one' : 'all';

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <View style={styles.root}>
      <AlbumArtBackground albumArtUri={metadata.albumArtUri} />

      {isLoading && !error && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.gold} />
        </View>
      )}

      {!isLoading && (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }>

        {/* Header */}
        <AudioPlayerHeader onGoBack={handleGoBack} insetsTop={insets.top} colors={colors} />

        {/* Error state */}
        {error && (
          <PlayerErrorFallback
            title="Playback Error"
            message={error}
            fileName={title}
            onRetry={handleRetry}
            onGoBack={() => navigation.goBack()}
            onOpenSettings={errorIsPermission ? () => Linking.openSettings() : undefined}
          />
        )}

        {!error && (
          <TransportDependentContent
            metadata={metadata}
            title={title}
            fileUri={fileUri ?? ''}
            chapters={chapters}
            lyrics={lyrics}
            volume={volume}
            shuffle={shuffle}
            loopMode={mappedLoopMode}
            playlist={playlist}
            currentIndex={currentIndex}
            colors={colors}
            onGoBack={handleGoBack}
            onSeek={handleSeek}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            onToggleShuffle={handleToggleShuffle}
            onToggleLoop={handleToggleLoop}
            onVolumeChange={handleVolumeChange}
            onSeekToLyric={handleSeekToLyric}
            onPlayFromPlaylist={handlePlayFromPlaylist}
            onOpenInfo={() => setInfoSheetVisible(true)}
            onOpenPlaylist={() => setPlaylistSheetVisible(true)}
            onOpenQueue={() => setQueueSheetVisible(true)}
            onOpenUserPlaylists={() => setUserPlaylistSheetVisible(true)}
          />
        )}
      </ScrollView>
      )}

      {/* ═══ Modals ═══ */}

      <InfoSheet
        visible={infoSheetVisible}
        onClose={() => setInfoSheetVisible(false)}
        metadata={metadata}
        chapters={chapters}
        currentTime={0}
        onSeek={(time) => {
          MpvPlayer.seekTo(time);
        }}
        relatedTracks={relatedTracks}
        onAddToPlaylist={handleInfoAddToPlaylist}
        onPlayRelatedTrack={handlePlayRelatedTrack}
      />

      <PlaylistPreviewSheet
        visible={playlistSheetVisible}
        onClose={() => setPlaylistSheetVisible(false)}
        queue={playlist.map((e: PlaylistEntry, i: number) => ({
          fileUri: e.uri,
          title: e.title,
          mediaType: 'audio' as const,
        }))}
        currentIndex={currentIndex}
        onSelectItem={(idx: number) => {
          if (idx >= 0 && idx !== currentIndex) {
            const entry = playlist[idx];
            if (entry) {
              dispatch(playFromPlaylist(idx));
              MpvPlayer.loadFile(entry.uri);
            }
          }
          setPlaylistSheetVisible(false);
        }}
      />

      <QueueSheet
        visible={queueSheetVisible}
        onClose={() => { setQueueSheetVisible(false); setQueueMultiSelect(false); }}
        currentTrack={currentFile}
        queue={queue}
        playbackHistory={playbackHistory}
        selectedQueueIndices={selectedQueueIndices}
        mode={queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={handleSelectQueueItem}
        onSelectHistoryItem={handleSelectHistoryItem}
        onMoveUp={(idx: number) => handleQueueMoveItem(idx, 'up')}
        onMoveDown={(idx: number) => handleQueueMoveItem(idx, 'down')}
        onRemoveItem={handleQueueRemoveItem}
        onEnterMultiSelect={handleEnterMultiSelect}
        onExitMultiSelect={handleExitMultiSelect}
        onToggleSelection={handleToggleSelection}
        onRemoveSelected={handleRemoveSelected}
        onMoveSelectedToTop={handleMoveSelectedToTop}
        onClearAll={handleClearAll}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
      />

      <PlaylistSheet
        visible={userPlaylistSheetVisible}
        onClose={() => setUserPlaylistSheetVisible(false)}
        currentItem={{
          fileUri: fileUri || '',
          title,
          duration: 0,
          artist: metadata.artist,
          album: metadata.album,
        }}
      />
    </View>
  );
};

// ══════════════════════════════════════════════════════════════
// TRANSPORT-DEPENDENT CONTENT
// ══════════════════════════════════════════════════════════════

interface TransportDependentContentProps {
  metadata: TrackMetadata;
  title: string;
  fileUri: string;
  chapters: Chapter[];
  lyrics: LrcLine[];
  volume: number;
  shuffle: boolean;
  loopMode: 'off' | 'all' | 'one';
  playlist: PlaylistEntry[];
  currentIndex: number;
  colors: ReturnType<typeof import('../../theme').useTheme>['colors'];
  onGoBack: () => void;
  onSeek: (pct: number) => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onVolumeChange: (delta: number) => void;
  onSeekToLyric: (time: number) => void;
  onPlayFromPlaylist: (idx: number) => void;
  onOpenInfo: () => void;
  onOpenPlaylist: () => void;
  onOpenQueue: () => void;
  onOpenUserPlaylists: () => void;
}

const TransportDependentContent: React.FC<TransportDependentContentProps> = ({
  metadata, title, fileUri, chapters, lyrics, volume,
  shuffle, loopMode, playlist, currentIndex, colors,
  onSeek, onPlayPause, onPrev, onNext, onToggleShuffle, onToggleLoop,
  onVolumeChange, onSeekToLyric, onPlayFromPlaylist,
  onOpenInfo, onOpenPlaylist, onOpenQueue, onOpenUserPlaylists,
}) => {
  const {position, duration, isPlaying} = useTransport();

  const seekBarChapters = useMemo(
    () => chapters.map(ch => ({startTime: ch.startTime, title: ch.title})),
    [chapters],
  );

  return (
    <>
      <AudioAlbumArt albumArtUri={metadata.albumArtUri} colors={colors} />
      <AudioTrackInfo title={title} artist={metadata.artist} album={metadata.album} fileUri={fileUri} colors={colors} />
      <AudioVisualizer isPlaying={isPlaying} />
      <View style={seekContainerStyle}>
        <SeekBar
          position={position}
          duration={duration}
          onSeek={onSeek}
          chapters={seekBarChapters}
        />
      </View>
      <AudioTransportControls
        isPlaying={isPlaying}
        shuffle={shuffle}
        loopMode={loopMode}
        onPlayPause={onPlayPause}
        onPrev={onPrev}
        onNext={onNext}
        onToggleShuffle={onToggleShuffle}
        onToggleLoop={onToggleLoop}
        colors={colors}
      />
      <AudioVolumeControl volume={volume} onVolumeChange={onVolumeChange} colors={colors} />
      <AudioActionButtons
        onInfo={onOpenInfo}
        onQueue={onOpenPlaylist}
        onManage={onOpenQueue}
        onPlaylists={onOpenUserPlaylists}
        colors={colors}
      />
      <LyricsQueuePanel
        lyrics={lyrics}
        currentPosition={position}
        isPlaying={isPlaying}
        onSeekToLyric={onSeekToLyric}
        queue={playlist.map(e => ({uri: e.uri, title: e.title, duration: e.duration}))}
        currentIndex={currentIndex}
        onPlayFromQueue={onPlayFromPlaylist}
      />
    </>
  );
};

const seekContainerStyle = {marginBottom: 24};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  seekContainer: {
    marginBottom: 24,
  },
});
