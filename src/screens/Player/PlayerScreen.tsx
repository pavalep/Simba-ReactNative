import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  requireNativeComponent,
  ViewStyle,
  Alert,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useColors} from '../../context/ThemeContext';
import {makeStyles} from '../../utils/makeStyles';
import {AppText} from '../../components/core/AppText/AppText';
import {MpvPlayer, MpvChapter, MpvTrack} from '../../native';
import {RootStackScreenProps} from '../../navigation/types';
import {pickSubtitleFile, isValidSubtitleFile, checkFileExists, validateMediaFile, FileValidation, pickMediaFile, getFileName} from '../../services/fileService';
import {useAppDispatch, useAppSelector} from '../../store';
import {savePlaybackPosition} from '../../store/slices/sessionSlice';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  nextTrack,
  previousTrack,
  setLoopMode,
  toggleShuffle,
  clearPlaylist,
  PlaylistEntry,
} from '../../store/slices/playerSlice';

type Props = RootStackScreenProps<'Player'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SEEK_BAR_HEIGHT = 16;

// ── Equalizer constants ──
const EQ_BANDS = [
  {freq: 31, label: '31'},
  {freq: 62, label: '62'},
  {freq: 125, label: '125'},
  {freq: 250, label: '250'},
  {freq: 500, label: '500'},
  {freq: 1000, label: '1K'},
  {freq: 2000, label: '2K'},
  {freq: 4000, label: '4K'},
  {freq: 8000, label: '8K'},
  {freq: 16000, label: '16K'},
];

const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 5, 3, 1, -1, 0, 1, 3, 4, 5],
  Pop: [-2, -1, 2, 4, 5, 4, 2, 0, -1, -2],
  Jazz: [3, 3, 2, 1, 0, 1, 2, 3, 3, 3],
  Classical: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
  Dance: [6, 5, 3, 1, -1, -1, 0, 2, 4, 5],
};

const FLAT = EQ_PRESETS['Flat']; // 10 zeros

/** Build mpv audio filter string from 10 gain values */
function buildEqFilter(gains: number[]): string {
  return gains
    .map((gain, i) => `equalizer=f=${EQ_BANDS[i].freq}:t=h:w=1.0:g=${gain}`)
    .join(',');
}

// Native video surface component — registered as "MpvRenderView" on Android
interface MpvRenderViewProps {
  nativePtr: number;
  style?: ViewStyle;
}
const MpvRenderViewNative =
  requireNativeComponent<MpvRenderViewProps>('MpvRenderView');

export const PlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const title = route.params?.fileTitle ?? 'The Grand Budapest Hotel';
  const fileUri = route.params?.fileUri;
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(65);
  const [nativePtr, setNativePtr] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);
  const [chapters, setChapters] = useState<MpvChapter[]>([]);
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isSeeking = useRef(false);
  const dispatch = useAppDispatch();
  const rememberPosition = useAppSelector(
    state => state.settings.rememberPlaybackPosition,
  );
  const sessionRecent = useAppSelector(state => state.session.recentFiles);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const fileUriRef = useRef<string | undefined>(fileUri);
  const titleRef = useRef(title);
  const resumeSeekDone = useRef(false);
  const [subtitleTracks, setSubtitleTracks] = useState<MpvTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null);
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);

  // ── Audio track state ──
  const [audioTracks, setAudioTracks] = useState<MpvTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);

  // ── Equalizer state ──
  const [eqGains, setEqGains] = useState<number[]>([...FLAT]);
  const [eqEnabled, setEqEnabled] = useState(false);
  const [eqPanelOpen, setEqPanelOpen] = useState(false);

  // ── Playlist state (from Redux) ──
  const playlist = useAppSelector(state => state.player.playlist);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);

  // Keep refs in sync
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { titleRef.current = title; }, [title]);

  // Find saved position for current file
  const savedEntry = fileUri && rememberPosition
    ? sessionRecent.find(f => f.fileUri === fileUri)
    : undefined;

  const toggleControls = () => setControlsVisible((p) => !p);

  const positionPct = duration > 0 ? Math.min(position / duration, 1) : 0;
  const currentTime = formatTime(position);
  const totalTime = formatTime(duration);
  const isPaused = !isPlaying;

  // ── Lifecycle: init player on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Validate file before loading
      if (fileUri) {
        const validation = await validateMediaFile(fileUri);
        if (cancelled) return;
        if (!validation.valid) {
          setError({
            title: validation.title,
            message: validation.message,
            detail: validation.detail,
          });
          return;
        }
      }

      const ok = MpvPlayer.initPlayer();
      if (!ok) {
        setError({
          title: 'Player Initialization Failed',
          message:
            'The native player engine could not be initialized. This may indicate a device compatibility issue.',
        });
        return;
      }

      const ptr = MpvPlayer.getNativePtr();
      setNativePtr(ptr);

      if (fileUri) {
        MpvPlayer.loadFile(fileUri);
      }

      setIsReady(true);
    })();

    return () => {
      cancelled = true;

      // Save playback position before unmounting
      const curUri = fileUriRef.current;
      const curPos = positionRef.current;
      const curDur = durationRef.current;
      if (curUri && rememberPosition && curPos > 0) {
        dispatch(
          savePlaybackPosition({
            fileUri: curUri,
            title: titleRef.current,
            position: curPos,
            duration: curDur,
          }),
        );
      }

      MpvPlayer.destroy();
      MpvPlayer.removeAllListeners();
    };
  }, [fileUri]);

  // ── Periodic position save (every 30s while playing) ──
  useEffect(() => {
    if (!isPlaying || !fileUri || !rememberPosition) return;

    const interval = setInterval(() => {
      const curPos = positionRef.current;
      if (curPos > 0) {
        dispatch(
          savePlaybackPosition({
            fileUri,
            title: titleRef.current,
            position: curPos,
            duration: durationRef.current,
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isPlaying, fileUri, rememberPosition, dispatch]);

  // ── Subscribe to mpv events ──
  useEffect(() => {
    if (!isReady) return;

    const unsubPos = MpvPlayer.on('onPositionChanged', ({position: pos}) => {
      if (!isSeeking.current) {
        setPosition(pos);
      }
    });

    const unsubState = MpvPlayer.on(
      'onPlaybackStateChanged',
      ({state}) => {
        setIsPlaying(state === 'playing');
      },
    );

    const unsubVol = MpvPlayer.on('onVolumeChanged', ({volume: vol}) => {
      setVolume(vol);
    });

    const unsubFile = MpvPlayer.on('onFileLoaded', ({file}) => {
      const dur = MpvPlayer.getDuration();
      setDuration(dur);
      setPosition(0);
      resumeSeekDone.current = false;

      // Resume from saved position
      if (savedEntry && savedEntry.position > 0) {
        // Small delay to let mpv settle before seeking
        setTimeout(() => {
          MpvPlayer.seekTo(savedEntry.position);
          resumeSeekDone.current = true;
        }, 300);
      }

      try {
        setChapters(MpvPlayer.getChapters());
        const tracks = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
        // Determine active audio track
        const audio = tracks.filter(t => t.type === 'audio');
        const activeAudio = audio.find(t => t.selected) || audio[0] || null;
        setActiveAudioTrack(activeAudio ? activeAudio.id : null);
      } catch {}
    });

    const unsubEnd = MpvPlayer.on('onEndReached', () => {
      setIsPlaying(false);
    });

    const unsubError = MpvPlayer.on('onError', ({message}) => {
      setError({
        title: 'Playback Error',
        message:
          message || 'An unknown error occurred during playback. The file may be corrupt or in an unsupported format.',
        detail: message ? undefined : 'No error details from player engine',
      });
    });

    const unsubTracks = MpvPlayer.on('onTracksChanged', () => {
      try {
        const tracks = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
      } catch {}
    });

    // Poll position/duration while playing
    const poll = setInterval(() => {
      if (!isSeeking.current) {
        try {
          setPosition(MpvPlayer.getPosition());
          setDuration(MpvPlayer.getDuration());
        } catch {
          // ignore polling errors
        }
      }
    }, 250);

    return () => {
      unsubPos();
      unsubState();
      unsubVol();
      unsubFile();
      unsubEnd();
      unsubError();
      unsubTracks();
      clearInterval(poll);
    };
  }, [isReady]);

  // ── Playlist handlers (defined first; used by transport controls) ──
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
      // If this is the first file, start playing it
      if (playlist.length === 0) {
        MpvPlayer.loadFile(entry.uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to add file to playlist.');
    }
  }, [dispatch, playlist.length]);

  const handleRemoveFromPlaylist = useCallback((index: number) => {
    dispatch(removeFromPlaylist(index));
  }, [dispatch]);

  const handlePlayFromPlaylist = useCallback((index: number) => {
    const entry = playlist[index];
    if (!entry) return;
    dispatch(playFromPlaylist(index));
    MpvPlayer.loadFile(entry.uri);
    setPlaylistPanelOpen(false);
  }, [dispatch, playlist]);

  const handleNextTrack = useCallback(() => {
    dispatch(nextTrack());
    const nextIdx = currentIndex + 1;
    if (nextIdx < playlist.length) {
      MpvPlayer.loadFile(playlist[nextIdx].uri);
    } else if (loopMode === 'playlist' && playlist.length > 0) {
      MpvPlayer.loadFile(playlist[0].uri);
    }
  }, [dispatch, currentIndex, playlist, loopMode]);

  const handlePrevTrack = useCallback(() => {
    dispatch(previousTrack());
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) {
      MpvPlayer.loadFile(playlist[prevIdx].uri);
    } else if (loopMode === 'playlist' && playlist.length > 0) {
      MpvPlayer.loadFile(playlist[playlist.length - 1].uri);
    }
  }, [dispatch, currentIndex, playlist, loopMode]);

  const handleToggleLoop = useCallback(() => {
    const next = loopMode === 'playlist' ? 'none' : 'playlist';
    dispatch(setLoopMode(next));
    MpvPlayer.setLoopMode(next);
  }, [dispatch, loopMode]);

  const handleToggleShuffle = useCallback(() => {
    dispatch(toggleShuffle());
    MpvPlayer.shufflePlaylist();
  }, [dispatch]);

  const handleClearPlaylist = useCallback(() => {
    dispatch(clearPlaylist());
    setPlaylistPanelOpen(false);
  }, [dispatch]);

  // ── Control handlers ──
  const handlePlayPause = useCallback(() => {
    try {
      MpvPlayer.togglePlayPause();
    } catch {}
  }, []);

  const handleNext = useCallback(() => {
    if (playlist.length > 0) {
      handleNextTrack();
    } else {
      try { MpvPlayer.next(); } catch {}
    }
  }, [playlist.length, handleNextTrack]);

  const handlePrev = useCallback(() => {
    if (playlist.length > 0) {
      handlePrevTrack();
    } else {
      try { MpvPlayer.previous(); } catch {}
    }
  }, [playlist.length, handlePrevTrack]);

  const handleSeek = useCallback(
    (pct: number) => {
      const time = pct * duration;
      setPosition(time);
      try {
        MpvPlayer.seekTo(time);
      } catch {}
    },
    [duration],
  );

  const handleVolumeChange = useCallback(() => {
    // Cycle through 0 → 25 → 50 → 75 → 100
    const next = volume >= 100 ? 0 : Math.min(volume + 25, 100);
    setVolume(next);
    try {
      MpvPlayer.setVolume(next);
    } catch {}
  }, [volume]);

  const handleScreenshot = useCallback(() => {
    try {
      MpvPlayer.screenshot();
    } catch {}
  }, []);

  // ── Subtitle handlers ──
  const handleSelectSubtitleTrack = useCallback((trackId: number | null) => {
    try {
      if (trackId === null) {
        // Disable subtitles
        MpvPlayer.selectTrack(-1);
        setActiveSubtitle(null);
      } else {
        MpvPlayer.selectTrack(trackId);
        setActiveSubtitle(trackId);
      }
      setSubtitlePanelOpen(false);
    } catch {}
  }, []);

  const handleToggleSubtitles = useCallback(() => {
    try {
      const next = !subtitleVisible;
      MpvPlayer.setTrackVisibility('sub', next);
      setSubtitleVisible(next);
    } catch {}
  }, [subtitleVisible]);

  const handleLoadExternalSubtitle = useCallback(async () => {
    try {
      const file = await pickSubtitleFile();
      if (!file) return;
      if (!isValidSubtitleFile(file.title)) {
        Alert.alert('Invalid File', 'Please select a subtitle file (.srt, .ass, .vtt).');
        return;
      }
      MpvPlayer.setProperty('sub-file', file.uri);
      setSubtitlePanelOpen(false);
      // Tracks will refresh via onTracksChanged event
    } catch {
      Alert.alert('Error', 'Failed to load subtitle file.');
    }
  }, []);

  // ── Audio track handler ──
  const handleSelectAudioTrack = useCallback((trackId: number | null) => {
    try {
      if (trackId === null) {
        MpvPlayer.selectTrack(-1);
        setActiveAudioTrack(null);
      } else {
        MpvPlayer.selectTrack(trackId);
        setActiveAudioTrack(trackId);
      }
      setAudioPanelOpen(false);
    } catch {}
  }, []);

  // ── Equalizer handlers ──
  const applyEqToMpv = useCallback((gains: number[], enabled: boolean) => {
    try {
      if (enabled) {
        const filterStr = buildEqFilter(gains);
        MpvPlayer.setProperty('af', filterStr);
      } else {
        MpvPlayer.setProperty('af', '');
      }
    } catch {}
  }, []);

  const handleEqBandChange = useCallback((index: number, value: number) => {
    setEqGains(prev => {
      const next = [...prev];
      next[index] = Math.round(value);
      applyEqToMpv(next, true);
      return next;
    });
    // Ensure EQ is on when adjusting bands
    setEqEnabled(true);
  }, [applyEqToMpv]);

  const handleToggleEq = useCallback(() => {
    setEqEnabled(prev => {
      const next = !prev;
      applyEqToMpv(eqGains, next);
      return next;
    });
  }, [eqGains, applyEqToMpv]);

  const handleApplyPreset = useCallback((name: string) => {
    const gains = EQ_PRESETS[name];
    if (!gains) return;
    setEqGains([...gains]);
    setEqEnabled(true);
    applyEqToMpv(gains, true);
  }, [applyEqToMpv]);

  const handleResetEq = useCallback(() => {
    setEqGains([...FLAT]);
    setEqEnabled(false);
    applyEqToMpv(FLAT, false);
  }, [applyEqToMpv]);

  // ── Retry: clear error & reinitialize ──
  const handleRetry = useCallback(() => {
    setError(null);
    setNativePtr(0);
    setIsReady(false);
    MpvPlayer.destroy();
    MpvPlayer.removeAllListeners();
    // The mount effect will re-run when error clears
  }, []);

  // ── Error screen ──
  if (error) {
    return (
      <View style={[styles.root, styles.errorContainer]}>
        {/* Error icon */}
        <View style={styles.errorIconCircle}>
          <AppText style={styles.errorIcon}>!</AppText>
        </View>

        {/* Error title */}
        <AppText
          variant="h6"
          color={colors.error}
          style={styles.errorTitle}>
          {error.title}
        </AppText>

        {/* Error message */}
        <AppText
          variant="body2"
          color={colors.textSecondary}
          style={styles.errorMessage}>
          {error.message}
        </AppText>

        {/* Detail (file path / size) */}
        {error.detail && (
          <AppText
            variant="small"
            color={colors.textHint}
            style={styles.errorDetail}>
            {error.detail}
          </AppText>
        )}

        {/* Action buttons */}
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.errorBtn, styles.errorBtnPrimary]}
            onPress={handleRetry}
            activeOpacity={0.8}>
            <AppText style={styles.errorBtnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.errorBtn, styles.errorBtnSecondary]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <AppText
              variant="body2"
              color={colors.osdForeground}>
              Choose Different File
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* ══ VIDEO SURFACE ══ */}
      <TouchableOpacity
        style={styles.videoSurface}
        activeOpacity={1}
        onPress={toggleControls}>
        {nativePtr > 0 && (
          <MpvRenderViewNative
            nativePtr={nativePtr}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.videoInner}>
          {!controlsVisible && (
            <View style={styles.centerPlayBtn}>
              <AppText style={styles.centerPlayIcon}>
                {isPlaying ? '▶' : '▶'}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ══ HEADER BAR ══ */}
      {controlsVisible && (
        <View style={[styles.headerBar, {paddingTop: insets.top}]}>
          <View style={styles.headerEdge} />

          <View style={styles.headerRow}>
            {/* Left: Back + Open */}
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.goBack()}>
                <AppText style={styles.headerBtnIcon}>←</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.openBtn}>
                <AppText variant="body2" color={colors.osdForeground}>
                  Open
                </AppText>
                <AppText style={styles.openArrow}>▾</AppText>
              </TouchableOpacity>
            </View>

            {/* Center: Title */}
            <View style={styles.headerCenter}>
              <AppText
                variant="subtitle2"
                color={colors.osdForeground}
                numberOfLines={1}
                style={styles.headerTitle}>
                {title}
              </AppText>
            </View>

            {/* Right: PiP + Menu + Window controls */}
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerBtn}>
                <AppText style={styles.headerBtnIcon}>⊞</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn}>
                <AppText style={styles.headerBtnIcon}>⋯</AppText>
              </TouchableOpacity>
              <View style={styles.winControls}>
                {['─', '□', '✕'].map((sym, i) => (
                  <TouchableOpacity key={i} style={styles.winBtn}>
                    <AppText style={styles.winBtnIcon}>{sym}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ══ CONTROLS BOX (seek + transport) ══ */}
      {controlsVisible && (
        <View
          style={[styles.controlsBox, {paddingBottom: insets.bottom + 8}]}>
          {/* Sheen overlay */}
          <View style={styles.controlsSheen} pointerEvents="none" />

          {/* Seek bar */}
          <TouchableOpacity
            style={styles.seekRow}
            activeOpacity={1}
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const trackWidth =
                SCREEN_WIDTH - 32 - 40 - 8 - 40 - 8; // padding + time labels
              const pct = Math.max(0, Math.min(1, x / trackWidth));
              handleSeek(pct);
            }}>
            <View style={styles.seekTrack} pointerEvents="none">
              <View style={styles.seekTrackBg} />
              <View
                style={[
                  styles.seekTrackFill,
                  {width: `${positionPct * 100}%`},
                ]}
              />
              {chapters.map((ch, i) => (
                <View
                  key={i}
                  style={[
                    styles.chapterMark,
                    {
                      left: `${
                        duration > 0
                          ? (ch.startTime / duration) * 100
                          : 0
                      }%`,
                      marginLeft: -1.5,
                    },
                  ]}
                />
              ))}
              <View
                style={[
                  styles.seekThumb,
                  {left: `${positionPct * 100}%`},
                ]}
              />
            </View>
            <AppText
              variant="time"
              color={colors.osdForeground}
              style={styles.timeLabel}>
              {currentTime}
            </AppText>
            <View style={styles.timeDivider} />
            <AppText
              variant="time"
              color={colors.osdForeground}
              style={styles.timeLabel}>
              {totalTime}
            </AppText>
          </TouchableOpacity>

          {/* Transport row */}
          <View style={styles.transportRow}>
            {/* Group 1: Previous / Play / Next */}
            <View style={styles.btnGroup}>
              <TransportBtn icon="⏮" onPress={handlePrev} />
              <TouchableOpacity
                style={styles.playBtn}
                onPress={handlePlayPause}>
                <AppText style={styles.playIcon}>
                  {isPlaying ? '⏸' : '▶'}
                </AppText>
              </TouchableOpacity>
              <TransportBtn icon="⏭" onPress={handleNext} />
            </View>

            <View style={styles.separator} />

            {/* Group 2: Volume + Equalizer */}
            <View style={styles.btnGroup}>
              <MenuBtn
                icon={volume === 0 ? '🔇' : '🔊'}
                onPress={handleVolumeChange}
              />
              <MenuBtn icon="⚙" active={eqEnabled} onPress={() => setEqPanelOpen(p => !p)} />
            </View>

            <View style={styles.separator} />

            {/* Group 3: Playlist + Shuffle + Loop + Screenshot */}
            <View style={styles.btnGroup}>
              <MenuBtn
                icon="☰"
                active={playlist.length > 0}
                onPress={() => setPlaylistPanelOpen(p => !p)}
              />
              <MenuBtn
                icon="🔀"
                active={shuffle}
                onPress={handleToggleShuffle}
              />
              <MenuBtn
                icon="🔁"
                active={loopMode === 'playlist'}
                onPress={handleToggleLoop}
              />
              <MenuBtn icon="📷" onPress={handleScreenshot} />
            </View>

            <View style={styles.separator} />

            {/* Group 4: CC + Audio (Future) + Fullscreen */}
            <View style={styles.btnGroup}>
              <MenuBtn
                icon="CC"
                active={activeSubtitle !== null}
                onPress={() => setSubtitlePanelOpen(p => !p)}
              />
              <MenuBtn
                icon="🎵"
                active={activeAudioTrack !== null}
                onPress={() => setAudioPanelOpen(p => !p)}
              />
              <TransportBtn icon="⛶" onPress={() => {}} />
            </View>
          </View>
        </View>
      )}

      {/* ══ OVERLAYS ══ */}
      {/* Trial watermark */}
      <View style={styles.trialWatermark} pointerEvents="none">
        <AppText style={styles.trialText}>TRIAL</AppText>
      </View>

      {/* OSD notification */}
      {controlsVisible && (
        <View style={styles.osdNotification}>
          <AppText variant="caption" color={colors.osdForeground}>
            Volume: {volume}%
          </AppText>
        </View>
      )}

      {/* Now Playing info */}
      <View style={styles.nowPlaying} pointerEvents="none">
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={styles.nowPlayingTitle}>
          {title}
        </AppText>
        <AppText
          variant="small"
          color={colors.textHint}
          style={styles.nowPlayingCodec}>
          1080p · H.264 · 5.1 AAC
        </AppText>
      </View>

      {/* ══ Playlist panel ══ */}
      {playlistPanelOpen && (
        <View style={styles.playlistPanel}>
          {/* Header */}
          <View style={styles.playlistPanelHeader}>
            <AppText variant="caption" color={colors.osdForeground} style={{fontWeight: '600'}}>
              Playlist ({playlist.length})
            </AppText>
            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
              <TouchableOpacity onPress={handleAddToPlaylist}>
                <AppText variant="caption" color={colors.accent}>+ Add</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPlaylistPanelOpen(false)}>
                <AppText variant="caption" color={colors.textSecondary}>✕</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.playlistDivider} />

          {/* Queue list */}
          {playlist.length === 0 ? (
            <View style={styles.playlistEmpty}>
              <AppText variant="body2" color={colors.textHint}>
                Playlist is empty
              </AppText>
              <TouchableOpacity
                style={styles.playlistAddFirstBtn}
                onPress={handleAddToPlaylist}>
                <AppText variant="body2" color={colors.accent}>
                  + Add Media Files
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.playlistScroll} showsVerticalScrollIndicator={false}>
              {playlist.map((entry, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <TouchableOpacity
                    key={`${entry.uri}-${idx}`}
                    style={[
                      styles.playlistRow,
                      isCurrent && styles.playlistRowActive,
                    ]}
                    onPress={() => handlePlayFromPlaylist(idx)}>
                    <View style={styles.playlistRowInfo}>
                      <AppText
                        variant="body2"
                        color={isCurrent ? colors.accent : colors.osdForeground}
                        numberOfLines={1}
                        style={styles.playlistRowTitle}>
                        {isCurrent ? '▶ ' : '  '}{entry.title}
                      </AppText>
                    </View>
                    <TouchableOpacity
                      style={styles.playlistRemoveBtn}
                      onPress={() => handleRemoveFromPlaylist(idx)}>
                      <AppText variant="caption" color={colors.error}>✕</AppText>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Clear all button */}
          {playlist.length > 0 && (
            <TouchableOpacity
              style={styles.playlistClearBtn}
              onPress={handleClearPlaylist}>
              <AppText variant="caption" color={colors.error}>
                Clear All
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ══ Subtitle selector panel ══ */}
      {subtitlePanelOpen && (
        <View style={styles.subtitlePanel}>
          {/* Header */}
          <View style={styles.subtitlePanelHeader}>
            <AppText variant="caption" color={colors.osdForeground} style={{fontWeight: '600'}}>
              Subtitles
            </AppText>
            <TouchableOpacity onPress={() => setSubtitlePanelOpen(false)}>
              <AppText variant="caption" color={colors.textSecondary}>✕</AppText>
            </TouchableOpacity>
          </View>

          {/* Toggle subtitles on/off */}
          <TouchableOpacity
            style={styles.subtitleRow}
            onPress={handleToggleSubtitles}>
            <AppText variant="body2" color={colors.osdForeground}>
              Show Subtitles
            </AppText>
            <View
              style={[
                styles.toggleTrack,
                subtitleVisible && styles.toggleTrackOn,
              ]}>
              <View
                style={[
                  styles.toggleThumb,
                  subtitleVisible && styles.toggleThumbOn,
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.subtitleDivider} />

          {/* Available subtitle tracks */}
          {subtitleTracks
            .filter(t => t.type === 'sub')
            .map(track => (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.subtitleRow,
                  activeSubtitle === track.id && styles.subtitleRowActive,
                ]}
                onPress={() => handleSelectSubtitleTrack(track.id)}>
                <View style={{flex: 1}}>
                  <AppText
                    variant="body2"
                    color={
                      activeSubtitle === track.id
                        ? colors.accent
                        : colors.osdForeground
                    }>
                    {track.title || `Track ${track.id}`}
                  </AppText>
                  {track.lang && (
                    <AppText variant="small" color={colors.textHint}>
                      {track.lang}
                    </AppText>
                  )}
                </View>
                {track.selected && (
                  <AppText variant="caption" color={colors.accent}>✓</AppText>
                )}
              </TouchableOpacity>
            ))}

          {/* Load external subtitle file */}
          <TouchableOpacity
            style={[styles.subtitleRow, styles.subtitleLoadBtn]}
            onPress={handleLoadExternalSubtitle}>
            <AppText variant="body2" color={colors.accent}>
              + Load External Subtitle
            </AppText>
          </TouchableOpacity>

          {/* Disable subtitles option */}
          {activeSubtitle !== null && (
            <TouchableOpacity
              style={[styles.subtitleRow, styles.subtitleDisableBtn]}
              onPress={() => handleSelectSubtitleTrack(null)}>
              <AppText variant="body2" color={colors.error}>
                Disable Subtitles
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ══ Audio track panel ══ */}
      {audioPanelOpen && (
        <View style={styles.audioPanel}>
          {/* Header */}
          <View style={styles.audioPanelHeader}>
            <AppText variant="caption" color={colors.osdForeground} style={{fontWeight: '600'}}>
              Audio Track
            </AppText>
            <TouchableOpacity onPress={() => setAudioPanelOpen(false)}>
              <AppText variant="caption" color={colors.textSecondary}>✕</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.audioDivider} />

          {audioTracks.length === 0 ? (
            <View style={styles.audioEmpty}>
              <AppText variant="body2" color={colors.textHint}>
                No audio tracks available
              </AppText>
            </View>
          ) : (
            audioTracks.map(track => (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.audioRow,
                  activeAudioTrack === track.id && styles.audioRowActive,
                ]}
                onPress={() => handleSelectAudioTrack(track.id)}>
                <View style={{flex: 1}}>
                  <AppText
                    variant="body2"
                    color={
                      activeAudioTrack === track.id
                        ? colors.accent
                        : colors.osdForeground
                    }>
                    {track.title || `Track ${track.id}`}
                  </AppText>
                  {track.lang && (
                    <AppText variant="small" color={colors.textHint}>
                      {track.lang}
                    </AppText>
                  )}
                </View>
                {activeAudioTrack === track.id && (
                  <AppText variant="caption" color={colors.accent}>✓</AppText>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Disable audio option */}
          {activeAudioTrack !== null && (
            <>
              <View style={styles.audioDivider} />
              <TouchableOpacity
                style={styles.audioRow}
                onPress={() => handleSelectAudioTrack(null)}>
                <AppText variant="body2" color={colors.error}>
                  Disable Audio
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ══ Equalizer panel ══ */}
      {eqPanelOpen && (
        <View style={styles.eqPanel}>
          {/* Header */}
          <View style={styles.eqHeader}>
            <AppText variant="caption" color={colors.osdForeground} style={{fontWeight: '600'}}>
              Equalizer
            </AppText>
            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
              <AppText variant="small" color={eqEnabled ? colors.accent : colors.textHint}>
                {eqEnabled ? 'ON' : 'OFF'}
              </AppText>
              <TouchableOpacity onPress={() => setEqPanelOpen(false)}>
                <AppText variant="caption" color={colors.textSecondary}>✕</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.eqDivider} />

          {/* Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eqPresetsScroll}>
            {Object.keys(EQ_PRESETS).map(name => (
              <TouchableOpacity
                key={name}
                style={styles.eqPresetBtn}
                onPress={() => handleApplyPreset(name)}>
                <AppText variant="small" color={colors.osdForeground}>{name}</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.eqPresetBtn, {borderColor: colors.error}]} onPress={handleResetEq}>
              <AppText variant="small" color={colors.error}>Reset</AppText>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.eqDivider} />

          {/* Toggle */}
          <View style={styles.eqToggleRow}>
            <AppText variant="body2" color={colors.osdForeground}>Enable EQ</AppText>
            <TouchableOpacity
              style={[styles.eqToggleTrack, eqEnabled && styles.eqToggleTrackOn]}
              onPress={handleToggleEq}>
              <View style={[styles.eqToggleThumb, eqEnabled && styles.eqToggleThumbOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.eqDivider} />

          {/* Band sliders */}
          <ScrollView style={styles.eqBandsScroll} showsVerticalScrollIndicator={false}>
            {EQ_BANDS.map((band, idx) => (
              <View key={band.freq} style={styles.eqBandRow}>
                <AppText variant="small" color={colors.textHint} style={styles.eqBandLabel}>
                  {band.label}
                </AppText>
                <AppText
                  variant="small"
                  color={
                    Math.abs(eqGains[idx]) > 2
                      ? colors.accent
                      : colors.textSecondary
                  }
                  style={styles.eqBandValue}>
                  {eqGains[idx] > 0 ? `+${eqGains[idx]}` : eqGains[idx]}
                </AppText>
                <Slider
                  style={styles.eqSlider}
                  minimumValue={-12}
                  maximumValue={12}
                  step={1}
                  value={eqGains[idx]}
                  onValueChange={val => handleEqBandChange(idx, val)}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor="rgba(255,255,255,0.15)"
                  thumbTintColor={colors.accent}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ── Helpers ─────────────────────────────────────
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Sub-components ─────────────────────────────────
function TransportBtn({
  icon,
  onPress,
}: {
  icon: string;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.transportBtn} onPress={onPress}>
      <AppText style={styles.transportBtnIcon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

function MenuBtn({
  icon,
  active,
  onPress,
}: {
  icon: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.menuBtn, active && styles.menuBtnActive]}
      onPress={onPress}>
      <AppText
        style={[styles.menuBtnIcon, active && styles.menuBtnIconActive]}>
        {icon}
      </AppText>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────
const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#000',
    },

    // ── Video surface ──
    videoSurface: {
      ...StyleSheet.absoluteFill,
    },
    videoInner: {
      flex: 1,
      backgroundColor: '#060608',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerPlayBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerPlayIcon: {
      fontSize: 28,
      color: 'rgba(255,255,255,0.7)',
      marginLeft: 4,
    },

    // ── Header bar ──
    headerBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.glassBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDim,
      zIndex: 20,
    },
    headerEdge: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.glassEdge,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      paddingHorizontal: 12,
      gap: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnIcon: {
      fontSize: 16,
      color: colors.osdForeground,
    },
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      height: 28,
    },
    openArrow: {
      fontSize: 10,
      color: colors.osdForeground,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      maxWidth: 200,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    winControls: {
      flexDirection: 'row',
    },
    winBtn: {
      width: 36,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    winBtnIcon: {
      fontSize: 12,
      color: colors.osdForeground,
    },

    // ── Controls box ──
    controlsBox: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.glassBg,
      borderTopWidth: 1,
      borderTopColor: colors.borderDim,
      zIndex: 15,
    },
    controlsSheen: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.glassSheenStart,
    },

    // ── Seek bar ──
    seekRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    seekTrack: {
      flex: 1,
      height: SEEK_BAR_HEIGHT,
      justifyContent: 'center',
      position: 'relative',
    },
    seekTrackBg: {
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.seekTrack,
    },
    seekTrackFill: {
      position: 'absolute',
      left: 0,
      top: 6,
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.seekFill,
    },
    seekThumb: {
      position: 'absolute',
      top: -1,
      width: 14,
      height: 14,
      borderRadius: 7,
      marginLeft: -7,
      backgroundColor: colors.seekThumb,
      borderWidth: 1.5,
      borderColor: colors.seekThumbBorder,
    },
    chapterMark: {
      position: 'absolute',
      top: 2,
      width: 3,
      height: 12,
      backgroundColor: colors.osdForeground,
      opacity: 0.5,
      borderRadius: 1,
    },
    timeLabel: {
      minWidth: 40,
      textAlign: 'center',
    },
    timeDivider: {
      width: 1,
      height: 14,
      backgroundColor: colors.divider,
      opacity: 0.3,
    },

    // ── Transport controls ──
    transportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 20,
      paddingBottom: 8,
      flexWrap: 'wrap',
    },
    btnGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    separator: {
      width: 1,
      height: 20,
      backgroundColor: colors.divider,
    },
    transportBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transportBtnIcon: {
      fontSize: 18,
      color: colors.osdForeground,
    },
    playBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playIcon: {
      fontSize: 22,
      color: colors.osdForeground,
      marginLeft: 2,
    },
    menuBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuBtnActive: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    menuBtnIcon: {
      fontSize: 14,
      color: colors.osdForeground,
    },
    menuBtnIconActive: {},

    // ── Trial watermark ──
    trialWatermark: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1,
    },
    trialText: {
      fontSize: 60,
      fontWeight: '700',
      letterSpacing: 8,
      color: 'rgba(255,255,255,0.06)',
    },

    // ── OSD Notification ──
    osdNotification: {
      position: 'absolute',
      bottom: 148,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      zIndex: 10,
      backgroundColor: colors.surfaceOverlay,
      borderWidth: 1,
      borderColor: colors.borderDim,
    },

    // ── Now Playing info ──
    nowPlaying: {
      position: 'absolute',
      bottom: 130,
      right: 16,
      zIndex: 10,
      alignItems: 'flex-end',
    },
    nowPlayingTitle: {
      fontWeight: '600',
    },
    nowPlayingCodec: {
      marginTop: 2,
    },

    // ── Error screen ──
    errorContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    errorIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    errorIcon: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FF3B30',
    },
    errorTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    errorMessage: {
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    errorDetail: {
      textAlign: 'center',
      opacity: 0.6,
      marginBottom: 28,
      maxWidth: '90%',
    },
    errorActions: {
      flexDirection: 'row',
      gap: 12,
    },
    errorBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBtnPrimary: {
      backgroundColor: colors.accent,
    },
    errorBtnPrimaryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000',
    },
    errorBtnSecondary: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },

    // ── Subtitle panel ──
    subtitlePanel: {
      position: 'absolute',
      right: 16,
      bottom: 140,
      width: 220,
      maxHeight: 320,
      backgroundColor: 'rgba(20, 20, 30, 0.95)',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
      paddingVertical: 4,
      zIndex: 100,
    },
    subtitlePanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      minHeight: 40,
    },
    subtitleRowActive: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    subtitleLoadBtn: {
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    subtitleDisableBtn: {
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    subtitleDivider: {
      height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginHorizontal: 14,
    },
    toggleTrack: {
      width: 36,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    toggleTrackOn: {
      backgroundColor: 'rgba(0, 255, 255, 0.3)',
    },
    toggleThumb: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#FFF',
    },
    toggleThumbOn: {
      alignSelf: 'flex-end',
    },

    // ── Playlist panel ──
    playlistPanel: {
      position: 'absolute',
      right: 60,
      bottom: 140,
      width: 240,
      maxHeight: 360,
      backgroundColor: 'rgba(20, 20, 30, 0.95)',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
      zIndex: 100,
    },
    playlistPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    playlistDivider: {
      height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    playlistEmpty: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 12,
    },
    playlistAddFirstBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    playlistScroll: {
      maxHeight: 260,
    },
    playlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      minHeight: 40,
    },
    playlistRowActive: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    playlistRowInfo: {
      flex: 1,
      marginRight: 8,
    },
    playlistRowTitle: {
      flexShrink: 1,
    },
    playlistRemoveBtn: {
      padding: 4,
    },
    playlistClearBtn: {
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },

    // ── Audio panel ──
    audioPanel: {
      position: 'absolute',
      right: 16,
      bottom: 140,
      width: 220,
      maxHeight: 320,
      backgroundColor: 'rgba(20, 20, 30, 0.95)',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
      paddingVertical: 4,
      zIndex: 100,
    },
    audioPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    audioDivider: {
      height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginHorizontal: 14,
    },
    audioEmpty: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    audioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      minHeight: 40,
    },
    audioRowActive: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },

    // ── Equalizer panel ──
    eqPanel: {
      position: 'absolute',
      right: 16,
      bottom: 140,
      width: 260,
      maxHeight: 420,
      backgroundColor: 'rgba(20, 20, 30, 0.95)',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
      paddingVertical: 4,
      zIndex: 100,
    },
    eqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    eqDivider: {
      height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginHorizontal: 14,
    },
    eqPresetsScroll: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    eqPresetBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.12)',
      marginHorizontal: 4,
    },
    eqToggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    eqToggleTrack: {
      width: 36,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    eqToggleTrackOn: {
      backgroundColor: colors.accent + '60',
    },
    eqToggleThumb: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.osdForeground,
    },
    eqToggleThumbOn: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
    },
    eqBandsScroll: {
      maxHeight: 240,
      paddingHorizontal: 10,
    },
    eqBandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    eqBandLabel: {
      width: 28,
      textAlign: 'right',
    },
    eqBandValue: {
      width: 30,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    eqSlider: {
      flex: 1,
      height: 32,
      marginLeft: 4,
    },
  }),
);
