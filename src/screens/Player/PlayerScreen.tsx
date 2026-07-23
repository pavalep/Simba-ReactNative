import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {MpvPlayer, MpvChapter, MpvTrack} from '../../native';
import {RootStackScreenProps} from '../../navigation/types';
import {useHaptics} from '../../hooks/useHaptics';
import {
  pickSubtitleFile,
  validateMediaFile,
  pickMediaFile,
  getFileName,
  getMediaType,
} from '../../services/fileService';
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
  clearPlayer,
  PlaylistEntry,
} from '../../store/slices/playerSlice';

// ── Extracted Components ──
import {PlayerVideoSurface} from './components/PlayerVideoSurface';
import {PlayerTopBar} from './components/PlayerTopBar';
import {PlayerControls} from './components/PlayerControls';
import {PlayerSubtitlePanel} from './components/PlayerSubtitlePanel';
import {PlayerAudioPanel} from './components/PlayerAudioPanel';
import {PlayerEqualizerPanel, EQ_BANDS, EQ_PRESETS} from './components/PlayerEqualizerPanel';
import {PlayerPlaylistPanel} from './components/PlayerPlaylistPanel';
import {SimbaStatusBar} from '../../components/StatusBar';
import {SlideUpPanel} from './components/SlideUpPanel';
import {PlayerLoadingOverlay} from './components/PlayerLoadingOverlay';
import PlayerGestureLayer from './components/PlayerGestureLayer';

// ── Types ──
type Props = RootStackScreenProps<'Player'>;

const FLAT = EQ_PRESETS['Flat'];

/** Build mpv audio filter string from 10 gain values */
function buildEqFilter(gains: number[]): string {
  return gains
    .map((gain, i) => `equalizer=f=${EQ_BANDS[i].freq}:t=h:w=1.0:g=${gain}`)
    .join(',');
}

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

// ── Screen ──
export const PlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Untitled';
  const fileUri = route.params?.fileUri;

  // ── Core playback state ──
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(65);
  const [nativePtr, setNativePtr] = useState(0);
  const [showVideoSurface, setShowVideoSurface] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);
  const [chapters, setChapters] = useState<MpvChapter[]>([]);

  // ── Subtitle state ──
  const [subtitleTracks, setSubtitleTracks] = useState<MpvTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null);
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [subtitleOpacity, setSubtitleOpacity] = useState(1);

  // ── Audio track state ──
  const [audioTracks, setAudioTracks] = useState<MpvTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);

  // ── Equalizer state ──
  const [eqGains, setEqGains] = useState<number[]>([...FLAT]);
  const [eqEnabled, setEqEnabled] = useState(false);
  const [eqPanelOpen, setEqPanelOpen] = useState(false);

  // ── Playlist state ──
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);

  // ── Refs ──
  const isSeeking = useRef(false);
  const dispatch = useAppDispatch();
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const fileUriRef = useRef<string | undefined>(fileUri);
  const titleRef = useRef(title);
  const resumeSeekDone = useRef(false);

  // ── Redux ──
  const rememberPosition = useAppSelector(
    state => state.settings.rememberPlaybackPosition,
  );
  const sessionRecent = useAppSelector(state => state.session.recentFiles);
  const playlist = useAppSelector(state => state.player.playlist);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);

  // ── Sync refs ──
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { titleRef.current = title; }, [title]);

  // ── Derived ──
  const savedEntry = fileUri && rememberPosition
    ? sessionRecent.find(f => f.fileUri === fileUri)
    : undefined;
  const toggleControls = () => setControlsVisible(p => !p);

  // ── Expanded mode (manual toggle, no auto-rotate) ──
  const [isLandscape, setIsLandscape] = useState(false);
  const handleToggleRotate = useCallback(() => {
    setIsLandscape(p => !p);
  }, []);

  // ══════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════

  // ── Back / Cleanup ──
  const handleGoBack = useCallback(() => {
    const curUri = fileUriRef.current;
    const curPos = positionRef.current;
    const curDur = durationRef.current;
    let thumbPath = '';
    try {
      if (curUri) {
        thumbPath = MpvPlayer.captureThumbnail(curUri);
      }
    } catch {}

    try { MpvPlayer.stop(); } catch {}
    setShowVideoSurface(false);

    requestAnimationFrame(() => {
      if (curUri) {
        dispatch(
          savePlaybackPosition({
            fileUri: curUri,
            title: titleRef.current,
            position: curPos,
            duration: curDur,
            thumbnailPath: thumbPath,
            mediaType: getMediaType(curUri),
          }),
        );
      }
      (navigation.navigate as unknown as (name: string) => void)('MainTabs');
    });
  }, [dispatch, navigation]);

  // ── Transport ──
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
    // If in playlist, go to next track
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

  const handleVolumeChange = useCallback(() => {
    MpvPlayer.toggleMute?.();
  }, []);

  // ── Gesture handlers ──
  const handleDoubleTapLeft = useCallback(() => {
    const target = Math.max(0, positionRef.current - 10);
    MpvPlayer.seekTo(target);
    setPosition(target);
  }, []);

  const handleDoubleTapRight = useCallback(() => {
    const target = Math.min(durationRef.current, positionRef.current + 10);
    MpvPlayer.seekTo(target);
    setPosition(target);
  }, []);

  const handleSwipeUp = useCallback(() => {
    MpvPlayer.toggleMute?.();
  }, []);

  const handleSwipeDown = useCallback(() => {
    MpvPlayer.toggleMute?.();
  }, []);

  const handleScreenshot = useCallback(() => {
    try {
      MpvPlayer.captureThumbnail(fileUriRef.current ?? '');
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

  // ── Subtitle ──
  const handleSelectSubtitle = useCallback((trackId: number | null) => {
    setActiveSubtitle(trackId);
    if (trackId === null) {
      MpvPlayer.setTrack('sub', 'no');
    } else {
      MpvPlayer.setTrack('sub', trackId);
    }
  }, []);

  const handleToggleSubtitleVisibility = useCallback(() => {
    setSubtitleVisible(p => !p);
    MpvPlayer.setProperty('sub-visibility', subtitleVisible ? 'no' : 'yes');
  }, [subtitleVisible]);

  const handleLoadExternalSubtitle = useCallback(async () => {
    try {
      const file = await pickSubtitleFile();
      if (!file) return;
      MpvPlayer.loadExternalSubtitle(file.uri);
      setSubtitlePanelOpen(false);
    } catch {}
  }, []);

  const handleFontSizeChange = useCallback((size: 'small' | 'medium' | 'large') => {
    setSubtitleFontSize(size);
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setSubtitleOpacity(opacity);
  }, []);

  // ── Audio track ──
  const handleSelectAudioTrack = useCallback((trackId: number | null) => {
    setActiveAudioTrack(trackId);
    if (trackId === null) {
      MpvPlayer.setTrack('audio', 'no');
    } else {
      MpvPlayer.setTrack('audio', trackId);
    }
  }, []);

  // ── Equalizer ──
  const handleBandChange = useCallback((index: number, value: number) => {
    setEqGains(prev => {
      const next = [...prev];
      next[index] = value;
      if (eqEnabled) {
        MpvPlayer.setProperty('af', buildEqFilter(next));
      }
      return next;
    });
  }, [eqEnabled]);

  const handleApplyPreset = useCallback((name: string) => {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    setEqGains([...preset]);
    if (eqEnabled) {
      MpvPlayer.setProperty('af', buildEqFilter(preset));
    }
  }, [eqEnabled]);

  const handleResetEq = useCallback(() => {
    setEqGains([...FLAT]);
    MpvPlayer.setProperty('af', buildEqFilter(FLAT));
    setEqEnabled(false);
  }, []);

  const handleToggleEq = useCallback(() => {
    setEqEnabled(p => {
      const next = !p;
      MpvPlayer.setProperty('af', next ? buildEqFilter(eqGains) : '');
      return next;
    });
  }, [eqGains]);

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
    } catch {
      // eslint-disable-next-line no-alert
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

  const handleClearPlaylist = useCallback(() => {
    dispatch(clearPlaylist());
  }, [dispatch]);

  // ── Error retry ──
  const handleRetry = useCallback(() => {
    setError(null);
    setIsReady(false);
    // Re-init will be triggered by a brief state toggle
    setNativePtr(0);
    setTimeout(() => {
      const ok = MpvPlayer.initPlayer();
      if (ok) {
        const ptr = MpvPlayer.getNativePtr();
        setNativePtr(ptr);
        setIsReady(true);
      } else {
        setError({
          title: 'Retry Failed',
          message: 'The player could not be re-initialized.',
        });
      }
    }, 500);
  }, []);

  // ══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════

  // ── Init player on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const playableUri = fileUri;

      if (playableUri) {
        const validation = await validateMediaFile(playableUri);
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
      setIsReady(true);

      const sub = MpvPlayer.onSurfaceAttached(() => {
        if (playableUri) {
          MpvPlayer.loadFile(playableUri);
        }
        sub?.remove();
      });
    })();

    return () => {
      cancelled = true;
      try {
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
              mediaType: getMediaType(curUri),
            }),
          );
        }
        try { MpvPlayer.stop(); } catch {}
        MpvPlayer.destroy();
        dispatch(clearPlayer());
      } catch {}
    };
  }, [dispatch, fileUri, rememberPosition]);

  // ── Periodic position save ──
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
            mediaType: getMediaType(fileUri ?? ''),
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isPlaying, fileUri, rememberPosition, dispatch]);

  // ── Android back button ──
  useEffect(() => {
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleGoBack]);

  // ── Mpv event subscriptions ──
  useEffect(() => {
    if (!isReady) return;

    const unsubPos = MpvPlayer.on('onPositionChanged', ({position: pos}) => {
      if (!isSeeking.current) {
        setPosition(pos);
      }
    });

    const unsubState = MpvPlayer.on(
      'onPlaybackStateChanged',
      ({state}: {state: string}) => {
        setIsPlaying(state === 'playing');
      },
    );

    const unsubVol = MpvPlayer.on('onVolumeChanged', ({volume: vol}) => {
      setVolume(vol);
    });

    const unsubFile = MpvPlayer.on('onFileLoaded', () => {
      const dur = MpvPlayer.getDuration();
      setDuration(dur);
      setPosition(0);
      resumeSeekDone.current = false;

      dispatch(
        savePlaybackPosition({
          fileUri: fileUriRef.current ?? '',
          title: titleRef.current,
          position: 0,
          duration: dur,
          mediaType: getMediaType(fileUriRef.current ?? ''),
        }),
      );

      if (savedEntry && savedEntry.position > 0) {
        setTimeout(() => {
          MpvPlayer.seekTo(savedEntry.position);
          resumeSeekDone.current = true;
        }, 300);
      }

      try {
        setChapters(Array.from(MpvPlayer.getChapters() ?? []));
        const tracks: MpvTrack[] = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
        const audio = tracks.filter(t => t.type === 'audio');
        const activeAudio = audio.find(t => t.selected) || audio[0] || null;
        setActiveAudioTrack(activeAudio ? activeAudio.id : null);
      } catch {}
    });

    const unsubEnd = MpvPlayer.on('onEndReached', () => {
      setIsPlaying(false);
    });

    const unsubError = MpvPlayer.on('onError', ({message: errMsg}) => {
      setError({
        title: 'Playback Error',
        message: errMsg || 'An unknown error occurred during playback.',
      });
    });

    const unsubTracks = MpvPlayer.on('onTracksChanged', () => {
      try {
        const tracks: MpvTrack[] = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
      } catch {}
    });

    // Poll position while playing (for smooth seek bar updates)
    const poll = setInterval(() => {
      if (!isSeeking.current) {
        try {
          const pos = MpvPlayer.getPosition();
          if (pos >= 0) setPosition(pos);
        } catch {}
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
  }, [isReady, savedEntry, dispatch]);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  // ── Error full-screen overlay ──
  if (error) {
    return (
      <View style={[styles.root, errorStyles.container]}>
        <View style={errorStyles.iconCircle}>
          <AppText style={errorStyles.icon}>!</AppText>
        </View>
        <AppText
          variant="h2"
          color="#FFFFFF"
          style={errorStyles.title}>
          {error.title}
        </AppText>
        <AppText
          variant="body2"
          color="secondary"
          style={errorStyles.message}>
          {error.message}
        </AppText>
        {error.detail && (
          <AppText
            variant="caption"
            color="tertiary"
            style={errorStyles.detail}>
            {error.detail}
          </AppText>
        )}
        <View style={errorStyles.actions}>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnPrimary]}
            onPress={handleRetry}
            activeOpacity={0.8}>
            <AppText style={errorStyles.btnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnSecondary]}
            onPress={handleGoBack}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">
              Choose Different File
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main player layout ──
  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      {/* ── Video Surface ── */}
      <PlayerGestureLayer
        onSingleTap={toggleControls}
        onDoubleTapLeft={handleDoubleTapLeft}
        onDoubleTapRight={handleDoubleTapRight}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}>
        <PlayerVideoSurface
          nativePtr={nativePtr}
          showVideoSurface={showVideoSurface}
          isPlaying={isPlaying}
          controlsVisible={controlsVisible}
        />
      </PlayerGestureLayer>

      {/* ── Top Bar (only when controls visible) ── */}
      {showVideoSurface && controlsVisible && (
        <PlayerTopBar
          title={title}
          onGoBack={handleGoBack}
          topInset={insets.top}
          isLandscape={isLandscape}
          onToggleRotate={handleToggleRotate}
        />
      )}

      {/* ── Controls (seek bar + transport) ── */}
      {showVideoSurface && (
        <PlayerControls
          controlsVisible={controlsVisible}
          position={position}
          duration={duration}
          isPlaying={isPlaying}
          volume={volume}
          chapters={chapters}
          currentTime={formatTime(position)}
          totalTime={formatTime(duration)}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onScreenshot={handleScreenshot}
          onToggleEqPanel={() => {
            setEqPanelOpen(p => !p);
            setAudioPanelOpen(false);
            setSubtitlePanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onTogglePlaylistPanel={() => {
            setPlaylistPanelOpen(p => !p);
            setEqPanelOpen(false);
            setAudioPanelOpen(false);
            setSubtitlePanelOpen(false);
          }}
          onToggleShuffle={handleToggleShuffle}
          onToggleLoop={handleToggleLoop}
          onToggleSubtitles={() => {
            setSubtitlePanelOpen(p => !p);
            setAudioPanelOpen(false);
            setEqPanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onToggleAudioPanel={() => {
            setAudioPanelOpen(p => !p);
            setSubtitlePanelOpen(false);
            setEqPanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          eqEnabled={eqEnabled}
          shuffle={shuffle}
          loopMode={loopMode}
          playlistLength={playlist.length}
          activeSubtitle={activeSubtitle}
          activeAudioTrack={activeAudioTrack}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── Slide-Up Panels ── */}
      <SlideUpPanel
        visible={subtitlePanelOpen}
        onClose={() => setSubtitlePanelOpen(false)}>
        <PlayerSubtitlePanel
          subtitleTracks={subtitleTracks}
          activeSubtitle={activeSubtitle}
          subtitleVisible={subtitleVisible}
          onSelectTrack={handleSelectSubtitle}
          onToggleVisibility={handleToggleSubtitleVisibility}
          onLoadExternal={handleLoadExternalSubtitle}
          onClose={() => setSubtitlePanelOpen(false)}
          subtitleFontSize={subtitleFontSize}
          onFontSizeChange={handleFontSizeChange}
          subtitleOpacity={subtitleOpacity}
          onOpacityChange={handleOpacityChange}
        />
      </SlideUpPanel>

      <SlideUpPanel
        visible={audioPanelOpen}
        onClose={() => setAudioPanelOpen(false)}>
        <PlayerAudioPanel
          audioTracks={audioTracks}
          activeAudioTrack={activeAudioTrack}
          onSelectTrack={handleSelectAudioTrack}
          onClose={() => setAudioPanelOpen(false)}
        />
      </SlideUpPanel>

      <SlideUpPanel
        visible={eqPanelOpen}
        onClose={() => setEqPanelOpen(false)}>
        <PlayerEqualizerPanel
          eqGains={eqGains}
          eqEnabled={eqEnabled}
          onBandChange={handleBandChange}
          onToggle={handleToggleEq}
          onApplyPreset={handleApplyPreset}
          onReset={handleResetEq}
          onClose={() => setEqPanelOpen(false)}
        />
      </SlideUpPanel>

      <SlideUpPanel
        visible={playlistPanelOpen}
        onClose={() => setPlaylistPanelOpen(false)}>
        <PlayerPlaylistPanel
          playlist={playlist.map(e => ({
            fileUri: e.uri,
            title: e.title,
            duration: e.duration,
          }))}
          currentIndex={currentIndex}
          onPlayFromPlaylist={handlePlayFromPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          onClearPlaylist={handleClearPlaylist}
          onAddToPlaylist={handleAddToPlaylist}
          onClose={() => setPlaylistPanelOpen(false)}
        />
      </SlideUpPanel>

      {/* ── Loading overlay ── */}
      <PlayerLoadingOverlay visible={!isReady && !error} message="Initializing player…" />
    </View>
  );
};

// ── Static styles ──
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});

// ── Error screen styles ──
const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,59,48,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF3B30',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  detail: {
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    maxWidth: 240,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#C9A84C',
  },
  btnPrimaryLabel: {
    color: '#0A0A0C',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
