import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Button} from './VideoV2Button';
import {VideoV2SeekBar} from './VideoV2SeekBar';

export const MiniVideoV2: React.FC<{model: VideoV2Model}> = ({model}) => {
  const insets = useSafeAreaInsets();
  const {colors, commands} = model;
  const status = model.isBuffering ? 'Buffering' : model.isEnded ? 'Finished' : model.isPlaying ? 'Playing' : 'Paused';

  return (
    <View pointerEvents="box-none" style={styles.anchor}>
      <View pointerEvents="auto" style={[styles.card, {bottom: Math.max(insets.bottom, 8) + 8, backgroundColor: colors.background.surfaceDark, borderColor: colors.border.emphasis, shadowColor: colors.shadow}]}>
        <View style={styles.preview} />
        <View style={styles.content}>
          <Text style={[styles.title, {color: colors.text.bright}]} numberOfLines={1}>{model.title || 'Now playing'}</Text>
          <Text style={[styles.status, {color: colors.text.onMediaMuted}]}>{status}</Text>
          <VideoV2SeekBar position={model.position} duration={model.duration} bufferedRanges={model.bufferedRanges} isSeekable={model.isSeekable && !model.isLive} isSeeking={model.isSeeking} isBuffering={model.isBuffering} accent={colors.accent.gold} trackColor={colors.background.highlightStrong} bufferedColor={colors.text.onMediaMuted} textColor={colors.text.bright} onSeek={commands.onSeek} compact />
        </View>
        <View style={styles.actions}>
          <VideoV2Button icon={model.isPlaying ? 'pause' : 'play'} label={model.isEnded ? 'Play from beginning' : model.isPlaying ? 'Pause' : 'Play'} onPress={commands.onPlayPause} color={colors.background.primary} backgroundColor={colors.accent.gold} size={40} />
          <VideoV2Button icon="chevronUp" label="Expand video player" onPress={commands.onExpand} color={colors.text.bright} size={34} />
          <VideoV2Button icon="close" label="Close video player" onPress={commands.onClose} color={colors.text.bright} size={34} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12},
  card: {minHeight: 104, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', padding: 8, gap: 10, elevation: 16, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.28, shadowRadius: 18},
  preview: {width: 122, height: 76, borderRadius: 12, overflow: 'hidden'},
  content: {flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', gap: 2},
  title: {fontSize: 13, fontWeight: '800'},
  status: {fontSize: 11, fontWeight: '600'},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 1},
});
