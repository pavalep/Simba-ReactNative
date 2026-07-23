import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import AudioVisualizer from '../../components/player/AudioVisualizer/AudioVisualizer';
import LyricsQueuePanel from './components/LyricsQueuePanel';
import {MpvPlayer} from '../../native';
import {RootStackScreenProps} from '../../navigation/types';
import {useHaptics} from '../../hooks/useHaptics';
import {useAppDispatch, useAppSelector} from '../../store';
import {savePlaybackPosition} from '../../store/slices/sessionSlice';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  nextTrack,
  setLoopMode,
  toggleShuffle,
  clearPlaylist,
  PlaylistEntry,
} from '../../store/slices/playerSlice';
import {
  pickMediaFile,
  getFileName,
} from '../../services/fileService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ART_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(65);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Playlist state ──
  const playlist = useAppSelector(state => state.player.playlist);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);

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
        return;
      }

      try {
        const ok = MpvPlayer.initPlayer();
        if (cancelled) return;
        if (!ok) {
          setError('Failed to initialize audio player.');
          return;
        }

        MpvPlayer.loadFile(fileUri);
        setIsReady(true);
      } catch (e) {
        if (!cancelled) setError('Player initialization failed.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUri]);

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

  const handleClearPlaylist = useCallback(() => {
    dispatch(clearPlaylist());
  }, [dispatch]);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  const loopLabel = loopMode === 'none' ? 'None' : loopMode === 'file' ? 'One' : 'All';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <TouchableOpacity
          style={[styles.headerBtn, {backgroundColor: colors.border.subtle}]}
          onPress={handleGoBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <AppText variant="body1" color="primary">{'←'}</AppText>
        </TouchableOpacity>
        <AppText variant="h3" color="primary" style={styles.headerTitle}>
          Now Playing
        </AppText>
        <View style={{width: 36}} />
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <AppText variant="body1" color="error">{error}</AppText>
          <TouchableOpacity
            style={[styles.retryBtn, {backgroundColor: colors.accent.gold}]}
            onPress={() => { setError(null); setIsReady(false); }}>
            <AppText variant="body2" color="primary">Retry</AppText>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <>
          {/* Album art */}
          <View style={styles.artContainer}>
            <View style={[styles.artPlaceholder, {backgroundColor: colors.border.subtle}]}>
              <AppText style={[styles.artIcon, {color: colors.text.tertiary}]}>
                {'♫'}
              </AppText>
            </View>
          </View>

          {/* Track info */}
          <View style={styles.infoContainer}>
            <AppText variant="h2" color="primary" style={styles.trackTitle} numberOfLines={1}>
              {title}
            </AppText>
            <AppText variant="body2" color="secondary" numberOfLines={1}>
              {getFileName(fileUri ?? '')}
            </AppText>
          </View>

          {/* Audio visualizer */}
          <AudioVisualizer isPlaying={isPlaying} />

          {/* Seek bar */}
          <View style={styles.seekContainer}>
            <TouchableOpacity
              style={styles.seekTrack}
              activeOpacity={1}
              onPress={({nativeEvent: {locationX}}: any) => {
                const pct = locationX / SCREEN_WIDTH;
                handleSeek(Math.max(0, Math.min(1, pct)));
              }}>
              <View style={[styles.seekBg, {backgroundColor: colors.border.subtle}]} />
              <View
                style={[
                  styles.seekFill,
                  {
                    backgroundColor: colors.accent.gold,
                    width: `${positionPct * 100}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.seekThumb,
                  {
                    backgroundColor: colors.accent.gold,
                    left: `${positionPct * 100}%`,
                  },
                ]}
              />
            </TouchableOpacity>
            <View style={styles.timeRow}>
              <AppText variant="caption" color="secondary">{formatTime(position)}</AppText>
              <AppText variant="caption" color="secondary">{formatTime(duration)}</AppText>
            </View>
          </View>

          {/* Transport controls */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, {backgroundColor: colors.border.subtle}]}
              onPress={handleToggleShuffle}
              activeOpacity={0.7}
              accessibilityLabel="Toggle shuffle"
              accessibilityRole="button">
              <AppText
                variant="body2"
                color={shuffle ? 'accent' : 'secondary'}>
                {'🔀'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handlePrev} activeOpacity={0.7}
              accessibilityLabel="Previous track"
              accessibilityRole="button">
              <AppText variant="h2" color="primary">{'⏮'}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playBtn, {backgroundColor: colors.accent.gold}]}
              onPress={handlePlayPause}
              activeOpacity={0.8}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              accessibilityRole="button">
              <AppText variant="h1" color="primary">
                {isPlaying ? '⏸' : '▶'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleNext} activeOpacity={0.7}
              accessibilityLabel="Next track"
              accessibilityRole="button">
              <AppText variant="h2" color="primary">{'⏭'}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, {backgroundColor: colors.border.subtle}]}
              onPress={handleToggleLoop}
              activeOpacity={0.7}>
              <AppText
                variant="caption"
                color={loopMode !== 'none' ? 'accent' : 'secondary'}>
                {loopLabel}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Volume control */}
          <View style={styles.volumeRow}>
            <TouchableOpacity
              onPress={() => handleVolumeChange(-10)}
              style={styles.volBtn}
              activeOpacity={0.7}
              accessibilityLabel="Volume down"
              accessibilityRole="button">
              <AppText variant="body2" color="secondary">{'−'}</AppText>
            </TouchableOpacity>
            <View style={styles.volTrack}>
              <View
                style={[
                  styles.volFill,
                  {backgroundColor: colors.accent.gold, width: `${volume}%`},
                ]}
              />
            </View>
            <AppText variant="caption" color="secondary" style={styles.volLabel}>
              {volume}%
            </AppText>
            <TouchableOpacity
              onPress={() => handleVolumeChange(10)}
              style={styles.volBtn}
              activeOpacity={0.7}
              accessibilityLabel="Volume up"
              accessibilityRole="button">
              <AppText variant="body2" color="secondary">{'+'}</AppText>
            </TouchableOpacity>
          </View>

          {/* Lyrics Queue Panel */}
          <LyricsQueuePanel
            lyrics={[]}
            currentPosition={position}
            isPlaying={isPlaying}
            onSeekToLyric={handleSeekToLyric}
            queue={playlist.map(e => ({uri: e.uri, title: e.title, duration: e.duration}))}
            currentIndex={currentIndex}
            onPlayFromQueue={handlePlayFromPlaylist}
          />
        </>
      )}
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
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 36,
  },
  // ── Error ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  // ── Album art ──
  artContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  artPlaceholder: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: {
    fontSize: 64,
  },
  // ── Info ──
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  trackTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
  // ── Seek ──
  seekContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  seekTrack: {
    height: 32,
    justifyContent: 'center',
  },
  seekBg: {
    height: 4,
    borderRadius: 4,
  },
  seekFill: {
    position: 'absolute',
    left: 0,
    top: 14,
    height: 4,
    borderRadius: 4,
  },
  seekThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 8,
    marginLeft: -8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  // ── Transport ──
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Volume ──
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  volBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volTrack: {
    width: 120,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    borderRadius: 4,
  },
  volLabel: {
    minWidth: 40,
    textAlign: 'center',
  },
  // ── Playlist info ──
  playlistInfo: {
    alignItems: 'center',
    paddingBottom: 16,
  },
});
