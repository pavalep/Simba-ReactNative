import React, {useCallback, useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../../store';
import {clearPlayer, playFromPlaylist, playFromQueue, setPlaybackState} from '../../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../../native';
import {usePlaybackCommands} from '../../PlaybackContext';
import {resolveNextTransition, resolvePreviousTransition} from '../../../../services/playbackTransitionService';
import {AudioV2Artwork} from './AudioV2Artwork';
import {AudioV2Button} from './AudioV2Button';
import {AudioV2Icon} from './AudioV2Icon';

export const MiniAudioV2: React.FC = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const {expandPlayer, closePlayer} = usePlaybackCommands();
  const {currentFile, playbackState, currentPosition, duration, playlist, queue, currentIndex, loopMode} = useAppSelector(state => state.player);

  useEffect(() => {
    const unsubscribe = MpvPlayer.on('onPlaybackStateChanged', ({state}) => dispatch(setPlaybackState(state)));
    return unsubscribe;
  }, [dispatch]);

  const track = currentFile;
  const title = track?.title?.trim() || track?.uri?.split('/').pop() || 'Untitled audio';
  const artist = track?.artist?.trim() || track?.source || 'Audio';
  const isPlaying = playbackState === 'playing';
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentPosition / duration)) : 0;

  const resumeNative = useCallback(() => {
    try {
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
      if (isPlaying) MpvPlayer.pause();
      else resumeNative();
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [dispatch, isPlaying, resumeNative, track]);

  const handleNext = useCallback(() => {
    if (!track) return;
    const transition = resolveNextTransition({lane: track.mediaType, playlist, queue, currentIndex, loopMode});
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
    if (currentPosition > 5) {
      try { MpvPlayer.seekTo(0); } catch { dispatch(setPlaybackState('error')); }
      return;
    }
    const transition = resolvePreviousTransition({lane: track.mediaType, playlist, queue, currentIndex, loopMode});
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
  }, [currentIndex, currentPosition, dispatch, loopMode, playlist, queue, track]);

  const handleDismiss = useCallback(() => {
    try { if (isPlaying) MpvPlayer.pause(); } catch { dispatch(setPlaybackState('error')); }
    dispatch(clearPlayer());
    closePlayer();
  }, [closePlayer, dispatch, isPlaying]);

  const status = useMemo(() => isPlaying ? 'Playing' : playbackState === 'error' ? 'Playback error' : 'Paused', [isPlaying, playbackState]);
  if (!track) return null;

  return (
    <View style={[styles.shell, {bottom: Math.max(10, insets.bottom + 8)}]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Expand ${title}`} onPress={expandPlayer} style={({pressed}) => [styles.main, pressed && styles.pressed]}>
        <AudioV2Artwork uri={track.artworkUri || ''} title={title} size={52} accent="#C9A227" borderRadius={15} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
          <View style={styles.metaRow}><View style={[styles.dot, {backgroundColor: isPlaying ? '#C9A227' : '#AAB1BE'}]} /><Text style={styles.status}>{status}</Text></View>
        </View>
        <AudioV2Button icon={isPlaying ? 'pause' : 'play'} label={isPlaying ? 'Pause' : 'Play'} onPress={handlePlayPause} color="#171A20" backgroundColor="#C9A227" size={46} />
        <AudioV2Button icon="close" label="Close mini player" onPress={handleDismiss} color="#FFFFFF" backgroundColor="rgba(255,255,255,0.12)" size={38} />
      </Pressable>
      <View pointerEvents="none" style={styles.progressTrack}><View style={[styles.progressFill, {width: `${progress * 100}%`}]} /></View>
      <View style={styles.quickRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={handlePrevious} style={styles.quickButton}><AudioV2Icon name="previous" size={18} color="#D5D9E0" /></Pressable>
        <Text style={styles.position}>{duration > 0 ? `${Math.floor(currentPosition / 60)}:${Math.floor(currentPosition % 60).toString().padStart(2, '0')}` : 'LIVE'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={handleNext} style={styles.quickButton}><AudioV2Icon name="next" size={18} color="#D5D9E0" /></Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {position: 'absolute', left: 14, right: 14, backgroundColor: '#171A20', borderRadius: 22, paddingTop: 10, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 16},
  main: {flexDirection: 'row', alignItems: 'center', minHeight: 64},
  copy: {flex: 1, marginLeft: 11, marginRight: 6},
  title: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
  artist: {color: '#B9C0CC', fontSize: 12, marginTop: 3},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5},
  dot: {width: 6, height: 6, borderRadius: 3},
  status: {color: '#8F98A7', fontSize: 10, fontWeight: '700'},
  progressTrack: {height: 3, backgroundColor: '#3D444F', borderRadius: 3, marginTop: 8},
  progressFill: {height: 3, backgroundColor: '#C9A227', borderRadius: 3},
  quickRow: {height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18},
  quickButton: {paddingHorizontal: 10, paddingVertical: 4},
  position: {color: '#8F98A7', fontSize: 10, fontVariant: ['tabular-nums']},
  pressed: {opacity: 0.72},
});
