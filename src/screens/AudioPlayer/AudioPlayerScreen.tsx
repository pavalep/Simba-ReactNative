import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import SeekBar from '../../components/player/SeekBar/SeekBar';
import AudioVisualizer from '../../components/player/AudioVisualizer/AudioVisualizer';
import LyricsQueuePanel from './components/LyricsQueuePanel';
import {AlbumArtBackground} from './components/AlbumArtBackground';
import {AudioPlayerHeader} from './components/AudioPlayerHeader';
import {AudioPlayerError} from './components/AudioPlayerError';
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
import {useHaptics} from '../../hooks/useHaptics';
import {useAppDispatch, useAppSelector} from '../../store';
import {savePlaybackPosition} from '../../store/slices/sessionSlice';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  removeFromQueue,
  reorderQueue,
  prependToQueue,
  addToQueue,
  nextTrack,
  setLoopMode,
  toggleShuffle,
  setQueueSelection,
  clearQueueSelection,
  removeSelectedFromQueue,
  moveSelectedToTop,
  clearAll,
  PlaylistEntry,
} from '../../store/slices/playerSlice';
import {
  pickMediaFile,
  getFileName,
} from '../../services/fileService';
import {readTrackMetadata, EMPTY_METADATA, TrackMetadata} from '../../services/metadataService';
import {loadLrc} from '../../services/lrcService';
import type {LrcLine} from '../../utils/lrcParser';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../store/slices/mediaSlice';


type Props = RootStackScreenProps<'AudioPlayer'>;

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioPlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const dispatch = useAppDispatch();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Unknown Track';
  const fileUri = route.params?.fileUri;

  // ── Core playback state ──
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(65);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Metadata & chapters state (Phase 4) ──
  const [metadata, setMetadata] = useState<TrackMetadata>(EMPTY_METADATA);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);

  // ── Modal state (Phase 4) ──
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);
  const [userPlaylistSheetVisible, setUserPlaylistSheetVisible] = useState(false);
  const [queueSheetVisible, setQueueSheetVisible] = useState(false);
  const [queueMultiSelect, setQueueMultiSelect] = useState(false);

  // ── Playlist state ──
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const currentFile = useAppSelector(state => state.player.currentFile);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const selectedQueueIndices = useAppSelector(state => state.player.selectedQueueIndices);
  const allTracks = useAppSelector(selectAllTracks);

  // ── Derive related tracks for InfoSheet (Phase 8) ──
  const relatedTracks = useMemo(() => {
    if (allTracks.length === 0) {
      return [];
    }
    const {artist, album} = metadata;
    if (!artist && !album) {
      return [];
    }
    return allTracks.filter(
      t =>
        (artist && t.artist === artist) ||
        (album && t.album === album),
    );
  }, [metadata, allTracks]);

  // ── Refs ──
  const isSeeking = useRef(false);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const fileUriRef = useRef<string | undefined>(fileUri);

  // ── Sync refs ──
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);

  const positionPct = duration > 0 ? Math.min(position / duration, 1) : 0;

  // ══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════

  // ── Init player on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!fileUri) {
        setError('No file URI provided.');
        setIsLoading(false);
        return;
      }

      try {
        const ok = MpvPlayer.initPlayer();
        if (cancelled) return;
        if (!ok) {
          setError('Failed to initialize audio player.');
          setIsLoading(false);
          return;
        }

        MpvPlayer.loadFile(fileUri);
        setIsReady(true);
        setIsLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('Player initialization failed.');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  // ── Load metadata, chapters, and lyrics when file loads (Phase 4) ──
  useEffect(() => {
    if (!isReady || !fileUri) return;

    let cancelled = false;

    (async () => {
      try {
        // Load metadata from mpv
        const meta = await readTrackMetadata(fileUri);
        if (!cancelled) setMetadata(meta);

        // Load chapters from mpv chapter-list property
        try {
          const chaptersJson = MpvPlayer.getProperty('chapter-list');
          if (chaptersJson && !cancelled) {
            const rawChapters: Array<{title?: string; time: number}> = JSON.parse(String(chaptersJson));
            if (Array.isArray(rawChapters) && rawChapters.length > 0) {
              const parsed: Chapter[] = rawChapters.map((ch, i, arr) => ({
                title: ch.title || `Chapter ${i + 1}`,
                startTime: ch.time,
                endTime: i < arr.length - 1 ? arr[i + 1].time : durationRef.current,
              }));
              if (!cancelled) setChapters(parsed);
            }
          }
        } catch {}

        // Load LRC lyrics
        try {
          const lrcResult = await loadLrc(fileUri);
          if (lrcResult && !cancelled) {
            setLyrics(lrcResult.lines);
          }
        } catch {}
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, fileUri]);

  // ── Retry chapter loading after duration is known ──
  useEffect(() => {
    if (!isReady || duration <= 1 || chapters.length > 0) return;
    // If we have chapters but no endTime for the last one, patch it
    setChapters(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.endTime === duration && last.endTime !== 0) return prev;
      return prev.map((ch, i, arr) => ({
        ...ch,
        endTime: i < arr.length - 1 ? arr[i + 1].startTime : duration,
      }));
    });
  }, [isReady, duration, chapters.length]);

  // ── Playback progress polling ──
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      try {
        const pos = MpvPlayer.getPosition();
        const dur = MpvPlayer.getDuration();
        const playing = MpvPlayer.getPlaybackState() === 'playing';

        if (!isNaN(pos)) setPosition(pos);
        if (!isNaN(dur)) setDuration(dur || 1);
        setIsPlaying(playing);
      } catch {}
    }, 250);

    return () => clearInterval(interval);
  }, [isReady]);

  // ── Hardware back ──
  useEffect(() => {
    const handler = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, []);

  // ══════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to refresh player.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    const curPos = positionRef.current;
    const curDur = durationRef.current;
    const curUri = fileUriRef.current;

    if (curUri) {
      dispatch(
        savePlaybackPosition({
          fileUri: curUri,
          title,
          position: curPos,
          duration: curDur,
          thumbnailPath: '',
          mediaType: 'audio',
        }),
      );
    }

    try { MpvPlayer.stop(); } catch {}

    navigation.goBack();
  }, [dispatch, navigation, title]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      MpvPlayer.pause();
    } else {
      MpvPlayer.resume();
    }
    haptics.medium();
  }, [isPlaying, haptics]);

  const handlePrev = useCallback(() => {
    MpvPlayer.seekTo(0);
  }, []);

  const handleNext = useCallback(() => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIdx = currentIndex + 1;
      dispatch(nextTrack());
      const entry = playlist[nextIdx];
      if (entry) MpvPlayer.loadFile(entry.uri);
    } else {
      MpvPlayer.seekTo(duration);
    }
  }, [playlist, currentIndex, duration, dispatch]);

  const handleSeek = useCallback((pct: number) => {
    isSeeking.current = true;
    const target = pct * durationRef.current;
    MpvPlayer.seekTo(target);
    setPosition(target);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleVolumeChange = useCallback((delta: number) => {
    setVolume(prev => {
      const next = Math.max(0, Math.min(100, prev + delta));
      try { MpvPlayer.setProperty('volume', next); } catch {}
      return next;
    });
  }, []);

  const handleSeekToLyric = useCallback((time: number) => {
    try {
      MpvPlayer.seekTo(time);
      setPosition(time);
    } catch {}
  }, []);

  // ── Shuffle / Loop ──
  const handleToggleShuffle = useCallback(() => {
    dispatch(toggleShuffle());
    haptics.medium();
  }, [dispatch, haptics]);

  const handleToggleLoop = useCallback(() => {
    const next = loopMode === 'none' ? 'file' : loopMode === 'file' ? 'playlist' : 'none';
    dispatch(setLoopMode(next));
    haptics.medium();
  }, [loopMode, dispatch, haptics]);

  // ── Playlist ──
  const handleAddToPlaylist = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      const entry: PlaylistEntry = {
        uri: file.uri,
        title: file.title || getFileName(file.uri),
        duration: 0,
      };
      dispatch(addToPlaylist(entry));
      if (playlist.length === 0) {
        MpvPlayer.loadFile(entry.uri);
      }
    } catch {}
  }, [dispatch, playlist.length]);

  const handleRemoveFromPlaylist = useCallback((index: number) => {
    dispatch(removeFromPlaylist(index));
  }, [dispatch]);

  const handlePlayFromPlaylist = useCallback((index: number) => {
    const entry = playlist[index];
    if (!entry) return;
    dispatch(playFromPlaylist(index));
    MpvPlayer.loadFile(entry.uri);
  }, [dispatch, playlist]);

  // ── Queue management (Phase 4 / Phase 23) ──

  const handleQueueMoveItem = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= queue.length) return;
    dispatch(reorderQueue({fromIndex, toIndex}));
  }, [dispatch, queue.length]);

  const handleQueueRemoveItem = useCallback((index: number) => {
    dispatch(removeFromQueue(index));
  }, [dispatch]);

  // Play a queue item: find its playlist entry and switch playback
  const handleQueueSelectItem = useCallback((fileUri: string) => {
    const playlistIdx = playlist.findIndex(e => e.uri === fileUri);
    if (playlistIdx >= 0 && playlistIdx !== currentIndex) {
      const entry = playlist[playlistIdx];
      if (entry) {
        dispatch(playFromPlaylist(playlistIdx));
        MpvPlayer.loadFile(entry.uri);
      }
    }
    setQueueSheetVisible(false);
  }, [dispatch, playlist, currentIndex]);

  // Queue item tap: find by index and play
  const handleSelectQueueItem = useCallback((idx: number) => {
    const item = queue[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [queue, handleQueueSelectItem]);

  // History item tap: play it (and optionally re-add to queue)
  const handleSelectHistoryItem = useCallback((idx: number) => {
    const item = playbackHistory[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [playbackHistory, handleQueueSelectItem]);

  // "Play Next" from history: prepend to queue
  const handlePlayNext = useCallback((entry: PlaylistEntry) => {
    dispatch(prependToQueue(entry));
  }, [dispatch]);

  // "Add to Queue" from history: append to queue
  const handleAddToQueue = useCallback((entry: PlaylistEntry) => {
    dispatch(addToQueue(entry));
  }, [dispatch]);

  // ── Queue multi-select (Phase 23.4 — 23.5) ──
  const handleEnterMultiSelect = useCallback(() => {
    setQueueMultiSelect(true);
  }, []);

  const handleExitMultiSelect = useCallback(() => {
    setQueueMultiSelect(false);
    dispatch(clearQueueSelection());
  }, [dispatch]);

  const handleToggleSelection = useCallback((index: number) => {
    const current = selectedQueueIndices;
    const isSelected = current.includes(index);
    if (isSelected) {
      dispatch(setQueueSelection(current.filter(i => i !== index)));
    } else {
      dispatch(setQueueSelection([...current, index]));
    }
  }, [dispatch, selectedQueueIndices]);

  const handleRemoveSelected = useCallback(() => {
    dispatch(removeSelectedFromQueue());
  }, [dispatch]);

  const handleMoveSelectedToTop = useCallback(() => {
    dispatch(moveSelectedToTop());
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    dispatch(clearAll());
  }, [dispatch]);

  // ── InfoSheet callbacks (Phase 8) ──
  const handleInfoAddToPlaylist = useCallback(() => {
    setInfoSheetVisible(false);
    // Small delay to let InfoSheet close before PlaylistSheet opens
    setTimeout(() => setUserPlaylistSheetVisible(true), 350);
  }, []);

  const handlePlayRelatedTrack = useCallback(
    (track: ScannedTrack) => {
      setInfoSheetVisible(false);
      MpvPlayer.loadFile(track.uri);
      setChapters([]);
      setIsPlaying(true);
    },
    [],
  );

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <View style={styles.root}>
      {/* Phase 4.6: Dual-layer album art background */}
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
          <AudioPlayerError message={error} onRetry={() => { setError(null); setIsReady(false); setIsLoading(true); }} colors={colors} />
        )}

        {!error && (
          <>
            {/* ═══ Album art (Phase 4.6) ═══ */}
            <AudioAlbumArt albumArtUri={metadata.albumArtUri} colors={colors} />

            {/* ═══ Track info with metadata (Phase 4.1) ═══ */}
            <AudioTrackInfo title={title} artist={metadata.artist} album={metadata.album} fileUri={fileUri ?? ''} colors={colors} />

            {/* ═══ Audio visualizer ═══ */}
            <AudioVisualizer isPlaying={isPlaying} />

            {/* ═══ SeekBar with chapters (Phase 4.8) ═══ */}
            <View style={styles.seekContainer}>
              <SeekBar
                position={position}
                duration={duration}
                onSeek={handleSeek}
                chapters={chapters.map(ch => ({startTime: ch.startTime, title: ch.title}))}
              />
            </View>

            {/* ═══ Transport controls ═══ */}
            <AudioTransportControls
              isPlaying={isPlaying}
              shuffle={shuffle}
              loopMode={loopMode}
              onPlayPause={handlePlayPause}
              onPrev={handlePrev}
              onNext={handleNext}
              onToggleShuffle={handleToggleShuffle}
              onToggleLoop={handleToggleLoop}
              colors={colors}
            />

            {/* ═══ Volume control ═══ */}
            <AudioVolumeControl volume={volume} onVolumeChange={handleVolumeChange} colors={colors} />

            {/* ═══ Action buttons (Phase 4.3, 4.4, 4.5) ═══ */}
            <AudioActionButtons
              onInfo={() => setInfoSheetVisible(true)}
              onQueue={() => setPlaylistSheetVisible(true)}
              onManage={() => setQueueSheetVisible(true)}
              onPlaylists={() => setUserPlaylistSheetVisible(true)}
              colors={colors}
            />

            {/* ═══ Lyrics Queue Panel with real lyrics (Phase 4.7) ═══ */}
            <LyricsQueuePanel
              lyrics={lyrics}
              currentPosition={position}
              isPlaying={isPlaying}
              onSeekToLyric={handleSeekToLyric}
              queue={playlist.map(e => ({uri: e.uri, title: e.title, duration: e.duration}))}
              currentIndex={currentIndex}
              onPlayFromQueue={handlePlayFromPlaylist}
            />
          </>
        )}
      </ScrollView>
      )}

      {/* ═══ Modals ═══ */}

      {/* Phase 4.5 / Phase 8: Now Playing Info Sheet */}
      <InfoSheet
        visible={infoSheetVisible}
        onClose={() => setInfoSheetVisible(false)}
        metadata={metadata}
        chapters={chapters}
        currentTime={position}
        onSeek={(time) => {
          MpvPlayer.seekTo(time);
          setPosition(time);
        }}
        relatedTracks={relatedTracks}
        onAddToPlaylist={handleInfoAddToPlaylist}
        onPlayRelatedTrack={handlePlayRelatedTrack}
      />

      {/* Phase 4.3: Playlist Preview Sheet */}
      <PlaylistPreviewSheet
        visible={playlistSheetVisible}
        onClose={() => setPlaylistSheetVisible(false)}
        queue={playlist.map((e, i) => ({
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

      {/* Phase 23: Queue Sheet (replaces legacy QueueManagementSheet) */}
      <QueueSheet
        visible={queueSheetVisible}
        onClose={() => { setQueueSheetVisible(false); setQueueMultiSelect(false); dispatch(clearQueueSelection()); }}
        currentTrack={currentFile}
        queue={queue}
        playbackHistory={playbackHistory}
        selectedQueueIndices={selectedQueueIndices}
        mode={queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={handleSelectQueueItem}
        onSelectHistoryItem={handleSelectHistoryItem}
        onMoveUp={(idx) => handleQueueMoveItem(idx, 'up')}
        onMoveDown={(idx) => handleQueueMoveItem(idx, 'down')}
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

      {/* Phase 9: Playlist Sheet */}
      <PlaylistSheet
        visible={userPlaylistSheetVisible}
        onClose={() => setUserPlaylistSheetVisible(false)}
        currentItem={{
          fileUri: fileUri || '',
          title,
          duration,
          artist: metadata.artist,
          album: metadata.album,
        }}
      />
    </View>
  );
};

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
  // ── Seek ──
  seekContainer: {
    marginBottom: 24,
  },
});
