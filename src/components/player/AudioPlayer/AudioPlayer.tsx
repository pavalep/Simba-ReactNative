import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  StyleSheet,
  Animated,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {ActivityOrb} from '../../feedback/ActivityOrb/ActivityOrb';
import {PlayerErrorFallback} from '../../feedback/PlayerErrorFallback';
import {BufferingBar} from '../BufferingBar/BufferingBar';
import AudioVisualizer from '../../player/AudioVisualizer/AudioVisualizer';
import AudioLyricsView from '../../player/AudioLyricsView/AudioLyricsView';
import {SvgIcon} from '../../utility/SvgIcon';
import LyricsQueuePanel from '../../../screens/AudioPlayer/components/LyricsQueuePanel';
import {AudioPlayerHeader} from '../../../screens/AudioPlayer/components/AudioPlayerHeader';
import {AudioTrackInfo} from '../../../screens/AudioPlayer/components/AudioTrackInfo';
import {AudioTransportControls} from '../../../screens/AudioPlayer/components/AudioTransportControls';
import {AudioActionRow} from './AudioActionRow';
import {AudioSubMenu} from './AudioSubMenu';
import {AudioQueuePeek} from './AudioQueuePeek';
import {AudioGradientBg} from './AudioGradientBg';
import {AudioAlbumArt} from './AudioAlbumArt';
import {AudioSeekBar} from './AudioSeekBar';
import {AudioVolumeSlider} from './AudioVolumeSlider';
import {InfoSheet} from '../NowPlayingInfo/InfoSheet';
import type {Chapter} from '../NowPlayingInfo/ChapterList';
import {AudioResumeOverlay} from '../../../screens/AudioPlayer/components/AudioResumeOverlay';
import {PlaylistPreviewSheet} from '../PlaylistPreview/PlaylistPreviewSheet';
import {QueueSheet} from '../../sheets/QueueSheet/QueueSheet';
import {PlaylistSheet} from '../../sheets/PlaylistSheet';
import {BookmarkSheet} from '../../bookmark/BookmarkSheet';
import {TransportProvider, useTransport} from '../../../contexts/TransportContext';
import {MpvPlayer} from '../../../native';
import {navigate} from '../../../navigation/navigationHelper';
import {formatSleepRemaining, sleepTimerModeLabel} from '../../../utils/sleepTimer';
import type {TrackMetadata} from '../../../services/metadataService';
import type {LrcLine} from '../../../utils/lrcParser';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import type {ColorTokens} from '../../../theme/tokens';

// ─── Hook Data Type ──────────────────────────────────────────

export interface AudioPlayerHookData {
  colors: ColorTokens;
  isDark: boolean;
  insets: {top: number; bottom: number; left: number; right: number};
  dispatch: any;

  // Route
  title: string;
  fileUri: string | null;
  /** P33: origin label for remote/streaming files (host, e.g. "cdn.example.com") */
  sourceLabel?: string;

  // State
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  errorIsPermission: boolean;
  refreshing: boolean;
  volume: number;
  /** 46.1: accessibility scale for control sizes (1 = default, >1 = larger) */
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

  // Bookmark state
  bookmarkSheetVisible: boolean;
  audioBookmarksForFile: any[];
  audioBookmarkCount: number;

  // Redux
  playlist: PlaylistEntry[];
  queue: PlaylistEntry[];
  currentFile: string | null;
  currentIndex: number;
  loopMode: 'none' | 'file' | 'playlist';
  shuffle: boolean;
  playbackHistory: PlaylistEntry[];
  selectedQueueIndices: number[];

  // Setters
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

  // Handlers
  onRefresh: () => Promise<void>;
  handleGoBack: () => void;
  handlePlayPause: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleSeek: (pct: number) => void;
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

  // Bookmark handlers
  handleOpenBookmarkSheet: () => void;
  handleCloseBookmarkSheet: () => void;
  handleBookmarkAdd: (label?: string) => void;
  handleBookmarkDelete: (id: string) => void;
  handleBookmarkJumpTo: (pos: number) => void;

  // 58.2: saved-position resume choice (mirrors 31.2 video overlay)
  resumePrompt: {position: number} | null;
  handleResumeChoice: (shouldResume: boolean) => void;
}

// ─── AudioPlayer Component ───────────────────────────────────

export const AudioPlayer: React.FC<AudioPlayerHookData> = (h) => {
  return (
    <TransportProvider
      isReady={false}
      enabled={true}
      chapters={h.chapters.map(c => ({startTime: c.startTime, endTime: c.endTime}))}>
      <AudioPlayerInner h={h} />
    </TransportProvider>
  );
};

// ─── Inner Component (has TransportContext) ──────────────────

interface InnerProps {
  h: AudioPlayerHookData;
}

const AudioTransportDependentContent: React.FC<{
  h: AudioPlayerHookData;
  position: number;
  duration: number;
  isPlaying: boolean;
  liked: boolean;
  onLike: () => void;
  onOpenSubMenu: () => void;
  onOpenLyricsView: () => void;
  colors: ColorTokens;
}> = ({h, position, duration, isPlaying, liked, onLike, onOpenSubMenu, onOpenLyricsView, colors}) => {
  const seekBarChapters = React.useMemo(
    () => h.chapters.map(ch => ({startTime: ch.startTime, title: ch.title})),
    [h.chapters],
  );

  // ── Track change cross-fade + scale pulse (26.7) ───────────
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const prevTrackKey = React.useRef<string | null>(h.fileUri);
  const animRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    const currentKey = h.fileUri;
    const prevKey = prevTrackKey.current;

    if (prevKey !== null && currentKey !== prevKey) {
      // Track changed — fade out old art, then fade in new art with scale pulse
      animRef.current = Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.spring(scaleAnim, {
              toValue: 1.03,
              friction: 4,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
      animRef.current.start();
    }

    prevTrackKey.current = currentKey;
    return () => {
      animRef.current?.stop();
    };
  }, [h.fileUri, fadeAnim, scaleAnim]);

  return (
    <>
      <Animated.View style={{opacity: fadeAnim, transform: [{scale: scaleAnim}]}}>
        <AudioAlbumArt albumArtUri={h.metadata.albumArtUri} />
      </Animated.View>
      <AudioTrackInfo
        title={h.title}
        artist={h.metadata.artist}
        album={h.metadata.album}
        fileUri={h.fileUri ?? ''}
        colors={h.colors}
      />
      <AudioVisualizer isPlaying={isPlaying} />
      {/* P36.2: LIVE badge for streams with unknown duration (radio) */}
      {duration <= 0 && (
        <View style={styles.liveBadgeRow}>
          <View
            style={[
              styles.liveBadge,
              {
                backgroundColor: colors.accent.goldDim,
                borderColor: colors.accent.gold,
              },
            ]}>
            <AppText
              variant="caption"
              style={[styles.liveBadgeText, {color: colors.accent.gold}]}>
              LIVE
            </AppText>
          </View>
        </View>
      )}
      <View style={seekContainerStyle}>
        <AudioSeekBar
          position={position}
          duration={duration}
          onSeek={h.handleSeek}
          chapters={seekBarChapters}
        />
      </View>
      <AudioTransportControls
        isPlaying={isPlaying}
        shuffle={h.shuffle}
        loopMode={h.loopMode === 'none' ? 'off' : h.loopMode === 'file' ? 'one' : 'all'}
        onPlayPause={h.handlePlayPause}
        onPrev={h.handlePrev}
        onNext={h.handleNext}
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
        onOpenSubMenu={onOpenSubMenu}
        liked={liked}
        onLike={onLike}
        shareTitle={h.title}
        shareArtist={h.metadata.artist}
        shareUri={h.fileUri ?? ''}
      />
      <View>
        <View style={lyricsHeaderStyle}>
          <AppText
            variant="caption"
            color="secondary"
            style={{marginBottom: 8, marginLeft: 20}}>
            Lyrics
          </AppText>
          <TouchableOpacity
            onPress={onOpenLyricsView}
            style={[expandBtnStyle, {backgroundColor: h.colors.border.subtle}]}
            activeOpacity={0.7}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            accessibilityRole="button"
            accessibilityLabel="Open lyrics view">
            <SvgIcon name="maximize" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
        <LyricsQueuePanel
          lyrics={h.lyrics}
          currentPosition={position}
          isPlaying={isPlaying}
          onSeekToLyric={h.handleSeekToLyric}
          queue={h.playlist.map(e => ({uri: e.uri, title: e.title, duration: e.duration}))}
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
    </>
  );
};

const AudioPlayerInner: React.FC<InnerProps> = ({h}) => {
  const {position, duration, isPlaying, isBuffering, sleepRemainingMs, sleepTimerActive, sleepTimerMode} = useTransport();
  const [submenuVisible, setSubmenuVisible] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [lyricsViewVisible, setLyricsViewVisible] = React.useState(false);

  const handleLike = React.useCallback(() => {
    setLiked(prev => !prev);
  }, []);

  const handleOpenLyricsView = React.useCallback(() => {
    setLyricsViewVisible(true);
  }, []);

  const handleCloseLyricsView = React.useCallback(() => {
    setLyricsViewVisible(false);
  }, []);

  return (
    <View style={styles.root}>
      <AudioGradientBg albumArtUri={h.metadata.albumArtUri} />

      {h.isLoading && !h.error && (
        <View style={styles.centerContainer}>
          <ActivityOrb size={48} />
        </View>
      )}

      {/* P33.4: stream stall indicator (orb + shimmer bar), shared with video */}
      <BufferingBar visible={isBuffering && h.isReady && !h.error} />

      {/* 58.2: Resume / Start Over choice on load (mirrors 31.2 video) */}
      {h.resumePrompt && (
        <AudioResumeOverlay
          position={h.resumePrompt.position}
          onResume={() => h.handleResumeChoice(true)}
          onStartOver={() => h.handleResumeChoice(false)}
        />
      )}

      {!h.isLoading && (
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

          {/* 50.3: countdown badge when a sleep timer is armed */}
          {sleepTimerActive && (
            <View style={[styles.sleepBadge, {backgroundColor: h.colors.accent.goldSoft}]}>
              <SvgIcon name="sliders" size={12} color={h.colors.accent.gold} />
              <AppText variant="caption" color="primary" style={styles.sleepBadgeText}>
                {sleepTimerMode === 'time'
                  ? `Sleep ${formatSleepRemaining(sleepRemainingMs)}`
                  : sleepTimerModeLabel(sleepTimerMode)}
              </AppText>
            </View>
          )}

          {h.error && (
            <PlayerErrorFallback
              title="Playback Error"
              message={h.error}
              fileName={h.title}
              onRetry={h.handleRetry}
              onGoBack={() => h.handleGoBack()}
              onOpenSettings={h.errorIsPermission ? () => Linking.openSettings() : undefined}
            />
          )}

          {!h.error && (
            <AudioTransportDependentContent
              h={h}
              position={position}
              duration={duration}
              isPlaying={isPlaying}
              liked={liked}
              onLike={handleLike}
              onOpenSubMenu={() => setSubmenuVisible(true)}
              onOpenLyricsView={handleOpenLyricsView}
              colors={h.colors}
            />
          )}
        </ScrollView>
      )}

      {/* ═══ Modals ═══ */}

      <InfoSheet
        visible={h.infoSheetVisible}
        onClose={() => h.setInfoSheetVisible(false)}
        metadata={h.metadata}
        chapters={h.chapters}
        currentTime={0}
        onSeek={(time) => { MpvPlayer.seekTo(time); }}
        relatedTracks={h.relatedTracks}
        onAddToPlaylist={h.handleInfoAddToPlaylist}
        onPlayRelatedTrack={h.handlePlayRelatedTrack}
      />

      <PlaylistPreviewSheet
        visible={h.playlistSheetVisible}
        onClose={() => h.setPlaylistSheetVisible(false)}
        queue={h.playlist.map((e: PlaylistEntry, _i: number) => ({
          fileUri: e.uri,
          title: e.title,
          mediaType: 'audio' as const,
        }))}
        currentIndex={h.currentIndex}
        onSelectItem={(idx: number) => {
          if (idx >= 0 && idx !== h.currentIndex) {
            const entry = h.playlist[idx];
            if (entry) {
              h.handlePlayFromPlaylist(idx);
            }
          }
          h.setPlaylistSheetVisible(false);
        }}
      />

      <QueueSheet
        visible={h.queueSheetVisible}
        onClose={() => { h.setQueueSheetVisible(false); h.setQueueMultiSelect(false); }}
        currentTrack={h.currentFile ? {uri: h.currentFile, title: h.title, duration: duration} : null}
        queue={h.queue}
        playbackHistory={h.playbackHistory}
        selectedQueueIndices={h.selectedQueueIndices}
        mode={h.queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={h.handleSelectQueueItem}
        onSelectHistoryItem={h.handleSelectHistoryItem}
        onMoveUp={(idx: number) => h.handleQueueMoveItem(idx, 'up')}
        onMoveDown={(idx: number) => h.handleQueueMoveItem(idx, 'down')}
        onRemoveItem={h.handleQueueRemoveItem}
        onEnterMultiSelect={h.handleEnterMultiSelect}
        onExitMultiSelect={h.handleExitMultiSelect}
        onToggleSelection={h.handleToggleSelection}
        onRemoveSelected={h.handleRemoveSelected}
        onMoveSelectedToTop={h.handleMoveSelectedToTop}
        onClearAll={h.handleClearAll}
        onPlayNext={h.handlePlayNext}
        onAddToQueue={h.handleAddToQueue}
        onOpenFullPage={() => {
          h.setQueueSheetVisible(false);
          // 48.6: sheet → full-page queue, remembering the audio context
          navigate('Queue', {from: 'audio'});
        }}
      />

      <PlaylistSheet
        visible={h.userPlaylistSheetVisible}
        onClose={() => h.setUserPlaylistSheetVisible(false)}
        currentItem={{
          fileUri: h.fileUri || '',
          title: h.title,
          duration: 0,
          artist: h.metadata.artist,
          album: h.metadata.album,
          // P34.1/34.4: keep art + origin + type so mixed playlists route correctly
          thumbnailPath: h.metadata.albumArtUri || undefined,
          source: h.sourceLabel,
          mediaType: 'audio',
        }}
      />

      <BookmarkSheet
        visible={h.bookmarkSheetVisible}
        onClose={h.handleCloseBookmarkSheet}
        currentPosition={MpvPlayer.getPosition?.() ?? 0}
        duration={MpvPlayer.getDuration?.() ?? 0}
        fileUri={h.fileUri ?? ''}
        fileTitle={h.title}
        mediaType="audio"
        bookmarks={h.audioBookmarksForFile}
        onSave={(label: string) => { h.handleBookmarkAdd(label); }}
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
        onLike={handleLike}
        onAddToPlaylist={() => {
          h.setUserPlaylistSheetVisible(true);
        }}
        onBookmark={h.handleOpenBookmarkSheet}
      />

      {/* ═══ Full-Screen Lyrics View (15.5) ═══ */}
      <AudioLyricsView
        visible={lyricsViewVisible}
        onClose={handleCloseLyricsView}
        lyrics={h.lyrics}
        currentPosition={position}
        isPlaying={isPlaying}
        onSeekToLyric={h.handleSeekToLyric}
        queue={h.playlist.map(e => ({uri: e.uri, title: e.title, duration: e.duration}))}
        currentIndex={h.currentIndex}
        onPlayFromQueue={h.handlePlayFromPlaylist}
      />
    </View>
  );
};

const seekContainerStyle = {marginBottom: 24};
const lyricsHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingRight: 20,
};
const expandBtnStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginBottom: 8,
};

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
  sleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  sleepBadgeText: {
    fontSize: 12,
  },
  liveBadgeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveBadgeText: {
    // v8: explicit Inter Bold via family key. No fontWeight
    // field — see Toast.tsx actionLabel comment for the
    // Android font-weight picker bug rationale.
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
});

export default AudioPlayer;
