import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Button} from './VideoV2Button';
import {VideoV2SeekBar} from './VideoV2SeekBar';

type VideoV2ControlsProps = Pick<VideoV2Model, 'colors' | 'title' | 'playbackState' | 'isPlaying' | 'isBuffering' | 'isSeeking' | 'isEnded' | 'isLive' | 'position' | 'duration' | 'bufferedRanges' | 'isSeekable' | 'controlsVisible' | 'controlsLocked' | 'isLandscape' | 'muted' | 'subtitleVisible' | 'hasNext' | 'hasPrevious' | 'pipSupported'> & {
  commands: VideoV2Model['commands'];
  onOpenMore: () => void;
};

export const VideoV2Controls: React.FC<VideoV2ControlsProps> = ({colors, title, playbackState, isPlaying, isBuffering, isSeeking, isEnded, isLive, position, duration, bufferedRanges, isSeekable, controlsVisible, controlsLocked, isLandscape, muted, subtitleVisible, hasNext, hasPrevious, pipSupported, commands, onOpenMore}) => {
  const dark = colors.background.primary;
  const text = colors.text.bright;
  const secondary = colors.text.onMediaMuted;
  const accent = colors.accent.gold;
  const busy = isBuffering || isSeeking;
  const statusLabel = isLive ? 'LIVE' : isEnded ? 'FINISHED' : playbackState === 'connecting' ? 'CONNECTING' : playbackState === 'error' ? 'PLAYBACK ERROR' : busy ? (isSeeking ? 'SEEKING' : 'BUFFERING') : isPlaying ? 'PLAYING' : 'PAUSED';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel={controlsVisible ? 'Pause or resume video' : controlsLocked ? 'Reveal locked video controls' : 'Show video controls'} onPress={commands.onSurfaceTap} style={StyleSheet.absoluteFill} />
      {!controlsVisible && !isPlaying && !controlsLocked ? (
        <View pointerEvents="box-none" style={styles.centerPlayLayer}>
          <VideoV2Button icon="play" label={isEnded ? 'Play from beginning' : 'Play'} onPress={commands.onPlayPause} color={dark} backgroundColor={accent} size={68} />
        </View>
      ) : null}
      {controlsVisible ? (
        <View pointerEvents="box-none" style={styles.controlsLayer}>
          <LinearGradient colors={[colors.background.scrimDeep, colors.background.scrimFaint]} style={styles.topBar}>
            <VideoV2Button icon="chevronDown" label="Minimize video player" onPress={commands.onMinimize} color={text} backgroundColor={colors.background.scrimStrong} size={44} />
            <Text style={[styles.title, {color: text}]} numberOfLines={1}>{title || 'Now playing'}</Text>
            <View style={styles.topActions}>
              <VideoV2Button icon={controlsLocked ? 'lock' : 'lockOpen'} label={controlsLocked ? 'Unlock controls' : 'Lock controls'} onPress={commands.onToggleControlsLock} color={text} backgroundColor={colors.background.scrimStrong} size={40} selected={controlsLocked} />
              <VideoV2Button icon="more" label="More video actions" onPress={onOpenMore} color={text} backgroundColor={colors.background.scrimStrong} size={40} />
            </View>
          </LinearGradient>
          <View style={styles.stateRow}>
            {busy ? <ActivityIndicator size="small" color={accent} /> : <View style={[styles.stateDot, {backgroundColor: isPlaying ? accent : secondary}]} />}
            <Text style={[styles.state, {color: text}]}>{statusLabel}</Text>
            {muted ? <Text style={[styles.muted, {color: secondary}]}>Muted</Text> : null}
          </View>
          <LinearGradient colors={[colors.background.scrimFaint, colors.background.scrimDeep]} style={[styles.bottomPanel, isLandscape && styles.landscapeBottomPanel]}>
            <VideoV2SeekBar position={position} duration={duration} bufferedRanges={bufferedRanges} isSeekable={isSeekable && !isLive} isSeeking={isSeeking} isBuffering={isBuffering} accent={accent} trackColor={colors.background.scrimStrong} bufferedColor={colors.text.onMediaMuted} textColor={text} onSeek={commands.onSeek} />
            <View style={styles.transportRow}>
              {hasPrevious ? <VideoV2Button icon="previous" label="Previous video" onPress={commands.onPrevious} color={text} size={44} /> : <View style={styles.spacer} />}
              <VideoV2Button icon="rewind" label="Rewind 10 seconds" onPress={commands.onRewind} color={text} size={44} />
              <VideoV2Button icon={isPlaying ? 'pause' : 'play'} label={isEnded ? 'Play from beginning' : isPlaying ? 'Pause' : 'Play'} onPress={commands.onPlayPause} color={dark} backgroundColor={accent} size={60} />
              <VideoV2Button icon="forward" label="Forward 10 seconds" onPress={commands.onForward} color={text} size={44} />
              {hasNext ? <VideoV2Button icon="next" label="Next video" onPress={commands.onNext} color={text} size={44} /> : <View style={styles.spacer} />}
            </View>
            <View style={styles.utilityRow}>
              <VideoV2Button icon="subtitles" label={subtitleVisible ? 'Hide captions' : 'Show captions'} onPress={commands.onToggleSubtitles} color={subtitleVisible ? accent : text} selected={subtitleVisible} size={42} />
              <VideoV2Button icon="fullscreen" label={isLandscape ? 'Exit fullscreen' : 'Enter fullscreen'} onPress={commands.onToggleFullscreen} color={text} size={42} />
              {pipSupported ? <VideoV2Button icon="pip" label="Enter Picture in Picture" onPress={commands.onEnterPip} color={text} size={42} /> : null}
            </View>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1},
  controlsLayer: {...StyleSheet.absoluteFill, justifyContent: 'space-between'},
  centerPlayLayer: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center'},
  topBar: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10},
  title: {flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700'},
  topActions: {flexDirection: 'row', gap: 2},
  stateRow: {position: 'absolute', top: 76, left: 16, flexDirection: 'row', alignItems: 'center', gap: 7},
  stateDot: {width: 7, height: 7, borderRadius: 4},
  state: {fontSize: 10, fontWeight: '800', letterSpacing: 1.3},
  muted: {fontSize: 10},
  bottomPanel: {paddingHorizontal: 14, paddingBottom: 14, paddingTop: 50, },
  landscapeBottomPanel: {paddingHorizontal: 28, paddingBottom: 10, paddingTop: 26},
  transportRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4},
  utilityRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6},
  spacer: {width: 44, height: 44},
});
