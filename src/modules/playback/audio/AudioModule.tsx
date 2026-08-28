import React, {useCallback, useMemo} from 'react';
import {useTransport} from '../../../contexts/TransportContext';
import {useNavigation} from '../../../navigation/useNavigation';
import type {ActivePlayback, PlaybackPresentation} from '../types';
import {useAudioPlaybackController} from './AudioPlaybackControllerContext';
import {AudioPlayer} from './AudioPlayer';
import {buildAudioViewModel, type AudioControllerState} from './AudioTypes';

interface AudioModuleProps {
  active: ActivePlayback;
  presentation?: PlaybackPresentation;
}

export const AudioModule: React.FC<AudioModuleProps> = ({presentation = 'expanded'}) => (
  <AudioContent presentation={presentation} />
);

const AudioContent: React.FC<Pick<AudioModuleProps, 'presentation'>> = ({presentation = 'expanded'}) => {
  const transport = useTransport();
  const controller = useAudioPlaybackController();
  // W5.8: EQ is unified under the settings-level screen. The
  // audio MorePanel exposes an "Open equalizer" row that uses the
  // standard typed navigation to push the Equalizer screen. The
  // per-player equalizer panel was a duplicate entry point and has
  // been moved to the dead-code archive.
  const navigation = useNavigation();
  const openEqualizer = useCallback(() => {
    // W5.8: `Equalizer` is a child route of the `Settings` tab —
    // navigate via the parent so the typed `RootStackParamList`
    // resolves correctly.
    navigation.navigate('Settings', {screen: 'Equalizer'});
  }, [navigation]);
  const {
    audioBookmarksForFile,
    handleBookmarkAdd,
    handleBookmarkDelete,
  } = controller;

  const toggleBookmark = useCallback(() => {
    const existing = audioBookmarksForFile[0];
    if (existing) {
      handleBookmarkDelete(existing.id);
      return;
    }
    handleBookmarkAdd();
  }, [audioBookmarksForFile, handleBookmarkAdd, handleBookmarkDelete]);

  const controllerState = useMemo<AudioControllerState>(
    () => ({
      colors: controller.colors,
      insets: controller.insets,
      title: controller.title,
      fileUri: controller.fileUri,
      sourceLabel: controller.sourceLabel,
      isLoading: controller.isLoading,
      isReady: controller.isReady,
      error: controller.error,
      errorIsPermission: controller.errorIsPermission,
      isPlaying: transport.isPlaying,
      isEnded: transport.isEnded,
      volume: controller.volume,
      metadata: controller.metadata,
      chapters: controller.chapters,
      lyrics: controller.lyrics,
      shuffle: controller.shuffle,
      loopMode: controller.loopMode,
      audioBookmarkCount: controller.audioBookmarkCount,
      playlist: controller.playlist,
      queue: controller.queue,
      relatedTracks: controller.relatedTracks,
      currentIndex: controller.currentIndex,
      resumePrompt: controller.resumePrompt,
      isBuffering: transport.isBuffering,
      isSeeking: transport.isSeeking,
      isSeekable: transport.isSeekable,
      bufferedRanges: transport.bufferedRanges,
      cacheFill: transport.cacheFill,
      onBack: controller.handleGoBack,
      onPlayPause: controller.handlePlayPause,
      onPrevious: controller.handlePrev,
      onNext: controller.handleNext,
      onRewind: controller.handleRewind,
      onForward: controller.handleForward,
      onSeek: controller.handleSeek,
      onSeekToLyric: controller.handleSeekToLyric,
      onVolumeChange: controller.handleVolumeChange,
      onToggleShuffle: controller.handleToggleShuffle,
      onToggleRepeat: controller.handleToggleLoop,
      onOpenBookmark: controller.handleOpenBookmarkSheet,
      onBookmark: toggleBookmark,
      onOpenQueue: () => controller.setQueueSheetVisible(true),
      onOpenLyrics: () => undefined,
      onOpenPlaylist: () => controller.setPlaylistSheetVisible(true),
      onOpenInfo: () => undefined,
      onPlayIndex: controller.handlePlayFromPlaylist,
      onPlayQueueIndex: controller.handlePlayQueueIndex,
      onPlayRelated: controller.handlePlayRelatedTrack,
      onShare: () => undefined,
      onMore: () => undefined,
      onDismiss: controller.handleGoBack,
      onRetry: controller.handleRetry,
      onResumeChoice: controller.handleResumeChoice,
    }),
    // A13: replace the whole `controller` dep with its scalar fields.
    // `useAudioPlayerScreen` returns a fresh object each render, so
    // having `controller` here meant this useMemo re-ran on every
    // parent render even when nothing actually changed. The fields
    // below are the only ones this object reads from the controller;
    // the rest flow through `transport` (already in deps).
    [
      toggleBookmark,
      controller.colors,
      controller.insets,
      controller.title,
      controller.fileUri,
      controller.sourceLabel,
      controller.isLoading,
      controller.isReady,
      controller.error,
      controller.errorIsPermission,
      controller.volume,
      controller.metadata,
      controller.chapters,
      controller.lyrics,
      controller.shuffle,
      controller.loopMode,
      controller.audioBookmarkCount,
      controller.playlist,
      controller.queue,
      controller.relatedTracks,
      controller.currentIndex,
      controller.resumePrompt,
      controller.handleGoBack,
      controller.handlePlayPause,
      controller.handlePrev,
      controller.handleNext,
      controller.handleRewind,
      controller.handleForward,
      controller.handleSeek,
      controller.handleSeekToLyric,
      controller.handleVolumeChange,
      controller.handleToggleShuffle,
      controller.handleToggleLoop,
      controller.handleOpenBookmarkSheet,
      controller.setQueueSheetVisible,
      controller.setPlaylistSheetVisible,
      controller.handlePlayFromPlaylist,
      controller.handlePlayQueueIndex,
      controller.handlePlayRelatedTrack,
      controller.handleRetry,
      controller.handleResumeChoice,
      controller.bookmarkConfirmDialog,
      transport.isBuffering,
      transport.isEnded,
      transport.isPlaying,
      transport.isSeekable,
      transport.isSeeking,
      transport.bufferedRanges,
      transport.cacheFill,
    ],
  );

  const model = useMemo(
    () => buildAudioViewModel(controllerState, transport.position, transport.duration),
    [controllerState, transport.duration, transport.position],
  );

  if (presentation !== 'expanded') return controller.bookmarkConfirmDialog;
  return (
    <>
      <AudioPlayer model={model} onOpenEqualizer={openEqualizer} />
      {controller.bookmarkConfirmDialog}
    </>
  );
};

export type {AudioModuleProps};
