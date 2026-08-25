import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Controls} from './VideoV2Controls';
import {VideoV2MoreSheet} from './VideoV2MoreSheet';
import {VideoV2PlaylistSheet} from './VideoV2PlaylistSheet';
import {VideoV2ContextSheet} from './VideoV2ContextSheet';
import {VideoV2Button} from './VideoV2Button';

export const VideoV2Player: React.FC<{model: VideoV2Model; visible?: boolean}> = ({model, visible = true}) => {
  const [moreVisible, setMoreVisible] = useState(false);
  const [playlistVisible, setPlaylistVisible] = useState(false);
  const [contextPanel, setContextPanel] = useState<'queue' | 'chapters' | 'info' | null>(null);
  const {colors, commands} = model;
  useEffect(() => {
    if (!visible) {
      setMoreVisible(false);
      setPlaylistVisible(false);
      setContextPanel(null);
    }
  }, [visible]);
  const panelActions = {
    onOpenPlaylist: () => setPlaylistVisible(true),
    onOpenQueue: () => setContextPanel('queue'),
    onOpenChapters: () => setContextPanel('chapters'),
    onOpenInfo: () => setContextPanel('info'),
  };

  if (model.error) {
    return (
      <View style={[styles.errorRoot, {backgroundColor: colors.background.surfaceDark}]}>
        <Text style={[styles.errorTitle, {color: colors.text.bright}]}>Unable to play video</Text>
        <Text style={[styles.errorMessage, {color: colors.text.onMediaSoft}]}>{model.error}</Text>
        <View style={styles.errorActions}>
          <VideoV2Button icon="play" label="Retry video" onPress={commands.onRetry} color={colors.background.primary} backgroundColor={colors.accent.gold} size={52} />
          <VideoV2Button icon="close" label="Close video player" onPress={commands.onClose} color={colors.text.bright} backgroundColor={colors.background.scrimStrong} size={52} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background.surfaceDark}]}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <VideoV2Controls {...model} controlsVisible={model.controlsVisible} commands={commands} onOpenMore={() => setMoreVisible(true)} />
      </SafeAreaView>
      {model.playbackState === 'connecting' || model.playbackState === 'buffering' ? (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent.gold} />
          <Text style={[styles.loadingText, {color: colors.text.onMediaSoft}]}>{model.loadingMessage}</Text>
        </View>
      ) : null}
      <VideoV2MoreSheet visible={moreVisible} onClose={() => setMoreVisible(false)} commands={commands} onOpenInfo={panelActions.onOpenInfo} onOpenQueue={panelActions.onOpenQueue} onOpenPlaylist={panelActions.onOpenPlaylist} onOpenChapters={panelActions.onOpenChapters} colors={colors} subtitles={model.subtitles} audioTracks={model.audioTracks} chapters={model.chapters} queue={model.queue} speed={model.speed} loopMode={model.loopMode} shuffle={model.shuffle} volume={model.volume} muted={model.muted} subtitleFontSize={model.subtitleFontSize} subtitleOpacity={model.subtitleOpacity} subtitlePosition={model.subtitlePosition} subtitleBgOpacity={model.subtitleBgOpacity} activeSubtitle={model.activeSubtitle} activeAudioTrack={model.activeAudioTrack} subtitleVisible={model.subtitleVisible} canAddToPlaylist={model.canAddToPlaylist} />
      <VideoV2PlaylistSheet visible={playlistVisible} onClose={() => setPlaylistVisible(false)} title={model.title} colors={colors} playlists={model.playlists} onSelect={commands.onSelectPlaylist} onCreate={commands.onCreatePlaylist} />
      <VideoV2ContextSheet visible={contextPanel !== null} panel={contextPanel ?? 'info'} onClose={() => setContextPanel(null)} colors={colors} queue={model.queue} chapters={model.chapters} metadata={model.metadata} title={model.title} onSelectQueueItem={commands.onSelectQueueItem} onSelectChapter={commands.onSelectChapter} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {...StyleSheet.absoluteFill},
  loading: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10},
  loadingText: {fontSize: 13, fontWeight: '700'},
  pressed: {opacity: 0.75, transform: [{scale: 0.97}]},
  errorRoot: {...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28},
  errorTitle: {fontSize: 22, fontWeight: '800', textAlign: 'center'},
  errorMessage: {fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10},
  errorActions: {flexDirection: 'row', gap: 16, marginTop: 24},
});
