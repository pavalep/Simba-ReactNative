import React, {useCallback, useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {useAppDispatch, useAppSelector} from '../../../../store';
import {clearPlayer, playFromPlaylist, playFromQueue, setPlaybackState} from '../../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../../native';
import {logger} from '../../../../lib/logger';
import {usePlaybackCommands} from '../../PlaybackContext';
import {useTransport} from '../../../../contexts/TransportContext';
import {selectCurrentBufferedWindow} from '../rangeNormalization';
import {resolveNextTransition, resolvePreviousTransition} from '../../../../services/playbackTransitionService';
import {AudioV2Artwork} from './AudioV2Artwork';
import {AudioV2Button} from './AudioV2Button';
import {AudioV2MiniProgress} from './AudioV2MiniProgress';

export const MiniAudioV2: React.FC = () => {
  const dispatch = useAppDispatch();
  const {colors} = useTheme();
  const palette = useMemo(() => ({
    card: colors.background.elevated,
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.tertiary,
    line: colors.border.subtle,
    accent: colors.accent.gold,
    accentWash: colors.accent.goldWash,
    buffered: colors.background.highlightStrong,
  }), [colors]);
  const insets = useSafeAreaInsets();
  const {expandPlayer, closePlayer} = usePlaybackCommands();
  const transport = useTransport();
  const {currentFile, playbackState, currentPosition, duration, playlist, queue, currentIndex, loopMode} = useAppSelector(state => state.player);

  useEffect(() => {
    const unsubscribe = MpvPlayer.on('onPlaybackStateChanged', ({state}) => dispatch(setPlaybackState(state)));
    return unsubscribe;
  }, [dispatch]);

  const track = currentFile;
  const title = track?.title?.trim() || track?.uri?.split('/').pop() || 'Untitled audio';
  const artist = track?.artist?.trim() || track?.source || 'Audio';
  const isPlaying = transport.isPlaying;
  const displayDuration = transport.duration > 1 ? transport.duration : duration;
  const displayPosition = transport.position > 0 ? transport.position : currentPosition;
  const bufferedRanges = selectCurrentBufferedWindow(transport.bufferedRanges, displayPosition, displayDuration);

  const resumeNative = useCallback((restart = false) => {
    try {
      if (restart) MpvPlayer.seekTo(0);
      MpvPlayer.resume();
      setTimeout(() => {
        try { MpvPlayer.resume(); } catch { /* native may already be playing */ }
      }, 280);
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [dispatch]);

  const handlePlayPause = useCallback(() => {
    if (!track) return;
    try {
      const nativeState = MpvPlayer.getPlaybackState();
      logger.info('[PlaybackTrace][MiniAudioV2][handlePlayPause]', {nativeState, uri: track.uri});
      if (nativeState === 'playing') {
        MpvPlayer.pause();
        dispatch(setPlaybackState('paused'));
      } else {
        resumeNative(transport.isEnded || nativeState === 'stopped');
        dispatch(setPlaybackState('playing'));
      }
    } catch (error) {
      logger.error('[PlaybackTrace][MiniAudioV2][handlePlayPause:error]', error);
      dispatch(setPlaybackState('error'));
    }
  }, [dispatch, resumeNative, track, transport.isEnded]);

  const handleNext = useCallback(() => {
    if (!track) return;
    const activePlaylistIndex = playlist.findIndex(entry => entry.uri === track.uri);
    const resolvedCurrentIndex = activePlaylistIndex >= 0 ? activePlaylistIndex : currentIndex;
    const transition = resolveNextTransition({lane: track.mediaType, playlist, queue, currentIndex: resolvedCurrentIndex, loopMode});
    logger.info('[PlaybackTrace][MiniAudioV2][handleNext]', {
      uri: track.uri,
      currentIndex,
      resolvedCurrentIndex,
      transition: transition.kind,
    });
    if (transition.kind === 'ended') {
      dispatch(setPlaybackState('stopped'));
      return;
    }
    if (transition.kind === 'queue') dispatch(playFromQueue(transition.queueIndex));
    else dispatch(playFromPlaylist(transition.playlistIndex));
    try {
      MpvPlayer.loadFile(transition.entry.uri);
      setTimeout(() => { try { MpvPlayer.resume(); } catch { /* load may still be settling */ } }, 320);
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [currentIndex, dispatch, loopMode, playlist, queue, track]);

  const handlePrevious = useCallback(() => {
    if (!track) return;
    const nativePosition = MpvPlayer.getPosition?.() ?? displayPosition;
    if (nativePosition > 5) {
      try { MpvPlayer.seekTo(0); } catch { dispatch(setPlaybackState('error')); }
      return;
    }
    const activePlaylistIndex = playlist.findIndex(entry => entry.uri === track.uri);
    const resolvedCurrentIndex = activePlaylistIndex >= 0 ? activePlaylistIndex : currentIndex;
    const transition = resolvePreviousTransition({lane: track.mediaType, playlist, queue, currentIndex: resolvedCurrentIndex, loopMode});
    logger.info('[PlaybackTrace][MiniAudioV2][handlePrevious]', {
      uri: track.uri,
      currentIndex,
      resolvedCurrentIndex,
      transition: transition.kind,
    });
    if (transition.kind === 'restart') {
      try { MpvPlayer.seekTo(0); } catch { dispatch(setPlaybackState('error')); }
      return;
    }
    dispatch(playFromPlaylist(transition.playlistIndex));
    try {
      MpvPlayer.loadFile(transition.entry.uri);
      setTimeout(() => { try { MpvPlayer.resume(); } catch { /* load may still be settling */ } }, 320);
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [currentIndex, dispatch, displayPosition, loopMode, playlist, queue, track]);

  const handleDismiss = useCallback(() => {
    try { if (isPlaying) MpvPlayer.pause(); } catch { dispatch(setPlaybackState('error')); }
    dispatch(clearPlayer());
    closePlayer();
  }, [closePlayer, dispatch, isPlaying]);

  const status = useMemo(
    () => transport.isSeeking ? 'Seeking' : transport.isBuffering ? 'Buffering' : isPlaying ? 'Playing' : transport.isEnded ? 'Finished' : playbackState === 'error' ? 'Playback error' : 'Paused',
    [isPlaying, playbackState, transport.isBuffering, transport.isEnded, transport.isSeeking],
  );
  if (!track) return null;

  return (
    <View style={[styles.shell, {backgroundColor: palette.card, borderColor: palette.line, bottom: Math.max(10, insets.bottom + 8)}]}>
      <View style={styles.main}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Expand ${title}`} onPress={expandPlayer} style={({pressed}) => [styles.mainTapArea, pressed && styles.pressed]}>
          <AudioV2Artwork uri={track.artworkUri || ''} title={title} size={50} accent={palette.accent} borderRadius={14} />
          <View style={styles.copy}>
            <Text style={[styles.title, {color: palette.primary}]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.artist, {color: palette.secondary}]} numberOfLines={1}>{artist}</Text>
            <View style={styles.metaRow}><View style={[styles.dot, {backgroundColor: transport.isSeeking || transport.isBuffering || isPlaying ? palette.accent : palette.muted}]} /><Text style={[styles.status, {color: palette.muted}]}>{status}</Text></View>
          </View>
        </Pressable>
        <View style={styles.cornerActions}>
          <AudioV2Button icon="chevronUp" label="Expand full player" onPress={expandPlayer} color={palette.secondary} backgroundColor={palette.accentWash} size={36} />
          <AudioV2Button icon="close" label="Close mini player" onPress={handleDismiss} color={palette.primary} backgroundColor={palette.accentWash} size={36} />
        </View>
      </View>
      <View style={styles.transportRow}>
        <AudioV2Button icon="previous" label="Previous track" onPress={handlePrevious} color={palette.secondary} size={40} />
        <AudioV2Button icon={isPlaying ? 'pause' : 'play'} label={isPlaying ? 'Pause' : transport.isEnded ? 'Play from beginning' : 'Play'} onPress={handlePlayPause} color={palette.card} backgroundColor={palette.accent} size={46} />
        <AudioV2Button icon="next" label="Next track" onPress={handleNext} color={palette.secondary} size={40} />
      </View>
      <AudioV2MiniProgress
        position={displayPosition}
        duration={displayDuration}
        bufferedRanges={bufferedRanges}
        isSeekable={transport.isSeekable}
        isSeeking={transport.isSeeking}
        isBuffering={transport.isBuffering}
        accent={palette.accent}
        trackColor={palette.line}
        bufferedColor={palette.buffered}
        onSeek={fraction => transport.seekTo(fraction)}
      />
      <View style={styles.positionRow}>
        <Text style={[styles.position, {color: palette.muted}]}>{displayDuration > 0 ? `${Math.floor(displayPosition / 60)}:${Math.floor(displayPosition % 60).toString().padStart(2, '0')}` : 'LIVE'}</Text>
        <Text style={[styles.position, {color: palette.muted}]}>{displayDuration > 0 ? `${Math.floor(displayDuration / 60)}:${Math.floor(displayDuration % 60).toString().padStart(2, '0')}` : ''}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {position: 'absolute', left: 14, right: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, paddingTop: 10, paddingHorizontal: 10, shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 10},
  main: {flexDirection: 'row', alignItems: 'center', minHeight: 60},
  mainTapArea: {flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 60},
  cornerActions: {flexDirection: 'row', alignItems: 'center', gap: 4},
  copy: {flex: 1, marginLeft: 11, marginRight: 6},
  title: {fontSize: 14, fontWeight: '800'},
  artist: {fontSize: 12, marginTop: 3},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5},
  dot: {width: 6, height: 6, borderRadius: 3},
  status: {fontSize: 10, fontWeight: '700'},
  transportRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 2},
  positionRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 3, marginTop: -2},
  position: {fontSize: 10, fontVariant: ['tabular-nums']},
  pressed: {opacity: 0.72},
});
