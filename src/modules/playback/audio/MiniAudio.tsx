import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {useAppSelector} from '../../../store';
import {usePlaybackCommands} from '../PlaybackContext';
import {useTransport} from '../../../contexts/TransportContext';
import {selectCurrentBufferedWindow} from './rangeNormalization';
import {useAudioPlaybackController} from './AudioPlaybackControllerContext';
import {AudioArtwork} from './AudioArtwork';
import {AudioButton} from './AudioButton';
import {AudioMiniProgress} from './AudioMiniProgress';

export const MiniAudio: React.FC = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {expandPlayer, closePlayer} = usePlaybackCommands();
  const transport = useTransport();
  const controller = useAudioPlaybackController();
  const {
    handlePlayPause: controllerPlayPause,
    handleNext: controllerNext,
    handlePrev: controllerPrevious,
    handleGoBack: controllerGoBack,
  } = controller;
  const track = useAppSelector(state => state.player.currentFile);
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

  const title = controller.title?.trim() || track?.title?.trim() || track?.uri?.split('/').pop() || 'Untitled audio';
  const artist = track?.artist?.trim() || track?.source || 'Audio';
  const isPlaying = transport.isPlaying;
  const displayDuration = transport.duration > 1 ? transport.duration : track?.duration ?? 0;
  const displayPosition = transport.position;
  const bufferedRanges = selectCurrentBufferedWindow(transport.bufferedRanges, displayPosition, displayDuration);

  const handlePlayPause = useCallback(() => {
    controllerPlayPause();
  }, [controllerPlayPause]);

  const handleNext = useCallback(() => {
    controllerNext();
  }, [controllerNext]);

  const handlePrevious = useCallback(() => {
    controllerPrevious();
  }, [controllerPrevious]);

  const handleDismiss = useCallback(() => {
    controllerGoBack();
    closePlayer();
  }, [closePlayer, controllerGoBack]);

  const status = useMemo(
    () => transport.isSeeking
      ? 'Seeking'
      : transport.isBuffering
        ? 'Buffering'
        : isPlaying
          ? 'Playing'
          : transport.isEnded
            ? 'Finished'
            : controller.error
              ? 'Playback error'
              : 'Paused',
    [controller.error, isPlaying, transport.isBuffering, transport.isEnded, transport.isSeeking],
  );

  if (!track) return null;

  return (
    <View style={[styles.shell, {backgroundColor: palette.card, borderColor: palette.line, bottom: Math.max(10, insets.bottom + 8), shadowColor: palette.primary}]}>
      <View style={styles.main}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Expand ${title}`} onPress={expandPlayer} style={({pressed}) => [styles.mainTapArea, pressed && styles.pressed]}>
          <AudioArtwork uri={track.artworkUri || ''} title={title} size={50} accent={palette.accent} borderRadius={14} />
          <View style={styles.copy}>
            <Text style={[styles.title, {color: palette.primary}]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.artist, {color: palette.secondary}]} numberOfLines={1}>{artist}</Text>
            <View style={styles.metaRow}><View style={[styles.dot, {backgroundColor: transport.isSeeking || transport.isBuffering || isPlaying ? palette.accent : palette.muted}]} /><Text style={[styles.status, {color: palette.muted}]}>{status}</Text></View>
          </View>
        </Pressable>
        <View style={styles.cornerActions}>
          <AudioButton icon="chevronUp" label="Expand full player" onPress={expandPlayer} color={palette.secondary} backgroundColor={palette.accentWash} size={36} />
          <AudioButton icon="close" label="Close mini player" onPress={handleDismiss} color={palette.primary} backgroundColor={palette.accentWash} size={36} />
        </View>
      </View>
      <View style={styles.transportRow}>
        <AudioButton icon="previous" label="Previous track" onPress={handlePrevious} color={palette.secondary} size={40} />
        <AudioButton icon={isPlaying ? 'pause' : 'play'} label={isPlaying ? 'Pause' : transport.isEnded ? 'Play from beginning' : 'Play'} onPress={handlePlayPause} color={palette.card} backgroundColor={palette.accent} size={46} />
        <AudioButton icon="next" label="Next track" onPress={handleNext} color={palette.secondary} size={40} />
      </View>
      <AudioMiniProgress
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
  shell: {position: 'absolute', left: 14, right: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, paddingTop: 10, paddingHorizontal: 10, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 10},
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
