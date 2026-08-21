import React from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../../components/feedback/ActivityOrb/ActivityOrb';
import {PlayerErrorFallback} from '../../../../components/feedback/PlayerErrorFallback';
import {BufferingBar} from '../../../../components/player/BufferingBar/BufferingBar';
import AudioLyricsView from '../../../../components/player/AudioLyricsView/AudioLyricsView';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import LyricsQueuePanel from '../components/LyricsQueuePanel';
import {AudioPlayerHeader} from '../components/AudioPlayerHeader';
import {AudioTrackInfo} from '../components/AudioTrackInfo';
import {AudioTransportControls} from '../components/AudioTransportControls';
import {AudioResumeOverlay} from '../components/AudioResumeOverlay';
import {AudioActionRow} from './AudioActionRow';
import {AudioSubMenu} from './AudioSubMenu';
import {AudioQueuePeek} from './AudioQueuePeek';
import {AudioGradientBg} from './AudioGradientBg';
import {AudioAlbumArt} from './AudioAlbumArt';
import {AudioSeekBar} from './AudioSeekBar';
import {AudioVolumeSlider} from './AudioVolumeSlider';
import {InfoSheet} from '../../../../components/player/NowPlayingInfo/InfoSheet';
import type {Chapter} from '../../../../components/player/NowPlayingInfo/ChapterList';
import {PlaylistPreviewSheet} from '../../../../components/player/PlaylistPreview/PlaylistPreviewSheet';
import {QueueSheet} from '../../../../components/sheets/QueueSheet/QueueSheet';
import {PlaylistSheet} from '../../../../components/sheets/PlaylistSheet';
import {BookmarkSheet} from '../../../../components/bookmark/BookmarkSheet';
import {TransportProvider, useTransport} from '../../../../contexts/TransportContext';
import {MpvPlayer} from '../../../../native';
import {navigate} from '../../../../navigation/navigationHelper';
import {formatSleepRemaining, sleepTimerModeLabel} from '../../../../utils/sleepTimer';
import type {TrackMetadata} from '../../../../services/metadataService';
import type {LrcLine} from '../../../../utils/lrcParser';
import type {PlaylistEntry} from '../../../../store/slices/playerSlice';
import type {ScannedTrack} from '../../../../store/slices/mediaSlice';
import type {ColorTokens} from '../../../../theme/tokens';
import type {MediaSource} from '../../../../types/media';

export interface AudioPlayerHookData {
  colors: ColorTokens;
  isDark: boolean;
  insets: {top: number; bottom: number; left: number; right: number};
  dispatch: any;
  title: string;
  fileUri: string | null;
  sourceLabel?: MediaSource;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  errorIsPermission: boolean;
  refreshing: boolean;
  volume: number;
  controlScale?: number;
  metadata: TrackMetadata;
  chapters: Chapter[];
  lyrics: LrcLine[];
  infoSheetVisible: boolean;
  playlistSheetVisible: boolean;
  userPlaylistSheetVisible: boolean;
  queueSheetVisible: boolean;
  queueMultiSelect: boolean;
  isPlaying: boolean;
  relatedTracks: ScannedTrack[];
  bookmarkSheetVisible: boolean;
  audioBookmarksForFile: any[];
  audioBookmarkCount: number;
  playlist: PlaylistEntry[];
  queue: PlaylistEntry[];
  currentFile: string | null;
  currentIndex: number;
  loopMode: 'none' | 'file' | 'playlist';
  shuffle: boolean;
  playbackHistory: PlaylistEntry[];
  selectedQueueIndices: number[];
  setInfoSheetVisible: (v: boolean) => void;
  setPlaylistSheetVisible: (v: boolean) => void;
  setUserPlaylistSheetVisible: (v: boolean) => void;
  setQueueSheetVisible: (v: boolean) => void;
  setQueueMultiSelect: (v: boolean) => void;
  setChapters: (v: Chapter[]) => void;
  setError: (v: string | null) => void;
  setIsLoading: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  onRefresh: () => Promise<void>;
  handleGoBack: () => void;
  handlePlayPause: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleSeek: (pct: number) => void;
  handleRewind: () => void;
  handleForward: () => void;
  handleVolumeChange: (delta: number) => void;
  handleSeekToLyric: (time: number) => void;
  handleToggleShuffle: () => void;
  handleToggleLoop: () => void;
  handleAddToPlaylist: () => Promise<void>;
  handleRemoveFromPlaylist: (idx: number) => void;
  handlePlayFromPlaylist: (idx: number) => void;
  handleQueueMoveItem: (idx: number, dir: 'up' | 'down') => void;
  handleQueueRemoveItem: (idx: number) => void;
  handleQueueSelectItem: (fileUri: string) => void;
  handleSelectQueueItem: (idx: number) => void;
  handleSelectHistoryItem: (idx: number) => void;
  handlePlayNext: (entry: PlaylistEntry) => void;
  handleAddToQueue: (entry: PlaylistEntry) => void;
  handleEnterMultiSelect: () => void;
  handleExitMultiSelect: () => void;
  handleToggleSelection: (idx: number) => void;
  handleRemoveSelected: () => void;
  handleMoveSelectedToTop: () => void;
  handleClearAll: () => void;
  handleInfoAddToPlaylist: () => void;
  handlePlayRelatedTrack: (track: ScannedTrack) => void;
  handleRetry: () => void;
  handleOpenBookmarkSheet: () => void;
  handleCloseBookmarkSheet: () => void;
  handleBookmarkAdd: (label?: string) => void;
  handleBookmarkDelete: (id: string) => void;
  handleBookmarkJumpTo: (pos: number) => void;
  resumePrompt: {position: number} | null;
  handleResumeChoice: (shouldResume: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerHookData> = h => (
  <TransportProvider
    isReady={h.isReady}
    enabled
    chapters={h.chapters.map(chapter => ({startTime: chapter.startTime, endTime: chapter.endTime}))}>
    <AudioPlayerInner h={h} />
  </TransportProvider>
);

const AudioPlayerInner: React.FC<{h: AudioPlayerHookData}> = ({h}) => {
  const transport = useTransport();
  const [submenuVisible, setSubmenuVisible] = React.useState(false);
  const [lyricsViewVisible, setLyricsViewVisible] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const loopMode = h.loopMode === 'none' ? 'off' : h.loopMode === 'file' ? 'one' : 'all';

  const seekBarChapters = React.useMemo(
    () => h.chapters.map(chapter => ({startTime: chapter.startTime, title: chapter.title})),
    [h.chapters],
  );

  return (
    <View style={styles.root}>
      <AudioGradientBg albumArtUri={h.metadata.albumArtUri} />
      <BufferingBar visible={transport.isBuffering && h.isReady && !h.error} />

      {h.isLoading && !h.error && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityOrb size={44} />
          <AppText variant="caption" color="secondary" style={styles.loadingLabel}>Preparing audio…</AppText>
        </View>
      )}

      {h.resumePrompt && (
        <AudioResumeOverlay
          position={h.resumePrompt.position}
          onResume={() => h.handleResumeChoice(true)}
          onStartOver={() => h.handleResumeChoice(false)}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={h.refreshing}
            onRefresh={h.onRefresh}
            tintColor={h.colors.accent.gold}
            colors={[h.colors.accent.gold]}
          />
        }>
        <AudioPlayerHeader onGoBack={h.handleGoBack} insetsTop={h.insets.top} colors={h.colors} />

        <View style={styles.topMeta}>
          <View style={[styles.statusDot, {backgroundColor: transport.isPlaying ? h.colors.accent.gold : h.colors.text.tertiary}]} />
          <AppText variant="caption" style={[styles.statusLabel, {color: h.colors.text.secondary}]}>
            {transport.isPlaying ? 'NOW PLAYING' : h.isReady ? 'PAUSED' : 'CONNECTING'}
          </AppText>
          {transport.sleepTimerActive && (
            <View style={[styles.sleepPill, {backgroundColor: h.colors.accent.goldWash}]}>
              <SvgIcon name="sliders" size={13} color={h.colors.accent.gold} />
              <AppText variant="caption" color="primary">
                {transport.sleepTimerMode === 'time'
                  ? formatSleepRemaining(transport.sleepRemainingMs)
                  : sleepTimerModeLabel(transport.sleepTimerMode)}
              </AppText>
            </View>
          )}
        </View>

        {h.error ? (
          <PlayerErrorFallback
            title="Playback error"
            message={h.error}
            fileName={h.title}
            onRetry={h.handleRetry}
            onGoBack={h.handleGoBack}
            onOpenSettings={h.errorIsPermission ? () => Linking.openSettings() : undefined}
          />
        ) : (
          <View style={[styles.playerSurface, {backgroundColor: h.colors.background.elevated, borderColor: h.colors.border.subtle}]}>
            <AudioAlbumArt albumArtUri={h.metadata.albumArtUri} />
            <AudioTrackInfo
              title={h.title}
              artist={h.metadata.artist}
              album={h.metadata.album}
              fileUri={h.fileUri ?? ''}
              colors={h.colors}
            />

            {transport.duration <= 0 ? (
              <View style={[styles.livePill, {backgroundColor: h.colors.accent.goldWash, borderColor: h.colors.accent.gold}]}>
                <AppText variant="caption" style={{color: h.colors.accent.gold}}>LIVE STREAM</AppText>
              </View>
            ) : null}

            <View style={styles.seekSection}>
              <AudioSeekBar
                position={transport.position}
                duration={transport.duration}
                onSeek={h.handleSeek}
                chapters={seekBarChapters}
              />
            </View>

            <AudioTransportControls
              isPlaying={transport.isPlaying}
              shuffle={h.shuffle}
              loopMode={loopMode}
              onPlayPause={h.handlePlayPause}
              onPrev={h.handlePrev}
              onNext={h.handleNext}
              onRewind={h.handleRewind}
              onForward={h.handleForward}
              onToggleShuffle={h.handleToggleShuffle}
              onToggleLoop={h.handleToggleLoop}
              colors={h.colors}
              controlScale={h.controlScale ?? 1}
            />

            <AudioVolumeSlider volume={h.volume} onVolumeChange={h.handleVolumeChange} />

            <AudioActionRow
              colors={h.colors}
              onBookmark={h.handleOpenBookmarkSheet}
              bookmarkCount={h.audioBookmarkCount}
              onInfo={() => h.setInfoSheetVisible(true)}
              onQueue={() => h.setPlaylistSheetVisible(true)}
              onManage={() => h.setQueueSheetVisible(true)}
              onPlaylists={() => h.setUserPlaylistSheetVisible(true)}
              onOpenSubMenu={() => setSubmenuVisible(true)}
              liked={liked}
              source={h.sourceLabel}
              onLike={() => setLiked(value => !value)}
              shareTitle={h.title}
              shareArtist={h.metadata.artist}
              shareUri={h.fileUri ?? ''}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="bodySmall" style={{color: h.colors.text.primary}}>Lyrics</AppText>
                <TouchableOpacity
                  style={[styles.iconButton, {backgroundColor: h.colors.background.elevated}]}
                  onPress={() => setLyricsViewVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open full lyrics">
                  <SvgIcon name="maximize" size={15} color={h.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <LyricsQueuePanel
                lyrics={h.lyrics}
                currentPosition={transport.position}
                isPlaying={transport.isPlaying}
                onSeekToLyric={h.handleSeekToLyric}
                queue={h.playlist.map(entry => ({uri: entry.uri, title: entry.title, duration: entry.duration}))}
                currentIndex={h.currentIndex}
                onPlayFromQueue={h.handlePlayFromPlaylist}
              />
            </View>

            <AudioQueuePeek
              colors={h.colors}
              currentIndex={h.currentIndex}
              queue={h.queue}
              currentTitle={h.title}
              currentArtist={h.metadata.artist}
              onTap={() => h.setQueueSheetVisible(true)}
            />
          </View>
        )}
      </ScrollView>

      <InfoSheet
        visible={h.infoSheetVisible}
        onClose={() => h.setInfoSheetVisible(false)}
        metadata={h.metadata}
        chapters={h.chapters}
        currentTime={transport.position}
        onSeek={time => MpvPlayer.seekTo(time)}
        relatedTracks={h.relatedTracks}
        onAddToPlaylist={h.handleInfoAddToPlaylist}
        onPlayRelatedTrack={h.handlePlayRelatedTrack}
      />
      <PlaylistPreviewSheet
        visible={h.playlistSheetVisible}
        onClose={() => h.setPlaylistSheetVisible(false)}
        queue={h.playlist.map(entry => ({fileUri: entry.uri, title: entry.title, source: entry.source, type: entry.type, mediaType: entry.mediaType, provider: entry.provider, folderId: entry.folderId}))}
        currentIndex={h.currentIndex}
        onSelectItem={index => {
          if (index >= 0 && index !== h.currentIndex) h.handlePlayFromPlaylist(index);
          h.setPlaylistSheetVisible(false);
        }}
      />
      <QueueSheet
        visible={h.queueSheetVisible}
        onClose={() => {h.setQueueSheetVisible(false); h.setQueueMultiSelect(false);}}
        currentTrack={h.playlist.find(entry => entry.uri === h.currentFile) ?? null}
        queue={h.queue}
        playbackHistory={h.playbackHistory}
        selectedQueueIndices={h.selectedQueueIndices}
        mode={h.queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={h.handleSelectQueueItem}
        onSelectHistoryItem={h.handleSelectHistoryItem}
        onMoveUp={index => h.handleQueueMoveItem(index, 'up')}
        onMoveDown={index => h.handleQueueMoveItem(index, 'down')}
        onRemoveItem={h.handleQueueRemoveItem}
        onEnterMultiSelect={h.handleEnterMultiSelect}
        onExitMultiSelect={h.handleExitMultiSelect}
        onToggleSelection={h.handleToggleSelection}
        onRemoveSelected={h.handleRemoveSelected}
        onMoveSelectedToTop={h.handleMoveSelectedToTop}
        onClearAll={h.handleClearAll}
        onPlayNext={h.handlePlayNext}
        onAddToQueue={h.handleAddToQueue}
        onOpenFullPage={() => {h.setQueueSheetVisible(false); navigate('Queue', {from: 'audio'});}}
      />
      <PlaylistSheet
        visible={h.userPlaylistSheetVisible}
        onClose={() => h.setUserPlaylistSheetVisible(false)}
        currentItem={{fileUri: h.fileUri || '', title: h.title, duration: transport.duration, artist: h.metadata.artist, album: h.metadata.album, thumbnailPath: h.metadata.albumArtUri || undefined, source: h.sourceLabel ?? 'api', type: 'music', mediaType: 'audio'}}
      />
      <BookmarkSheet
        visible={h.bookmarkSheetVisible}
        onClose={h.handleCloseBookmarkSheet}
        currentPosition={transport.position}
        duration={transport.duration}
        fileUri={h.fileUri ?? ''}
        fileTitle={h.title}
        mediaType="audio"
        bookmarks={h.audioBookmarksForFile}
        onSave={label => h.handleBookmarkAdd(label)}
        onDelete={h.handleBookmarkDelete}
        onJumpTo={h.handleBookmarkJumpTo}
      />
      <AudioSubMenu
        visible={submenuVisible}
        onClose={() => setSubmenuVisible(false)}
        colors={h.colors}
        title={h.title}
        artist={h.metadata.artist}
        album={h.metadata.album}
        albumArtUri={h.metadata.albumArtUri}
        fileUri={h.fileUri ?? ''}
        metadata={h.metadata}
        bookmarkCount={h.audioBookmarkCount}
        liked={liked}
        onLike={() => setLiked(value => !value)}
        onAddToPlaylist={() => h.setUserPlaylistSheetVisible(true)}
        onBookmark={h.handleOpenBookmarkSheet}
      />
      <AudioLyricsView
        visible={lyricsViewVisible}
        onClose={() => setLyricsViewVisible(false)}
        lyrics={h.lyrics}
        currentPosition={transport.position}
        isPlaying={transport.isPlaying}
        onSeekToLyric={h.handleSeekToLyric}
        queue={h.playlist.map(entry => ({uri: entry.uri, title: entry.title, duration: entry.duration}))}
        currentIndex={h.currentIndex}
        onPlayFromQueue={h.handlePlayFromPlaylist}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 44},
  topMeta: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 8},
  statusDot: {width: 7, height: 7, borderRadius: 4},
  statusLabel: {fontSize: 10, letterSpacing: 1.3},
  sleepPill: {flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12},
  loadingOverlay: {position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', zIndex: 3},
  loadingLabel: {marginTop: 8},
  playerSurface: {marginHorizontal: 16, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, borderRadius: 28, borderWidth: 1},
  livePill: {alignSelf: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12},
  seekSection: {marginTop: 22, marginBottom: 6},
  section: {marginTop: 12},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6},
  iconButton: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
});

export default AudioPlayer;
