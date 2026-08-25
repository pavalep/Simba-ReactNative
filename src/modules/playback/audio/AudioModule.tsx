import React, {useCallback, useMemo} from 'react';
import {useTransport} from '../../../contexts/TransportContext';
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
    [controller, toggleBookmark, transport.isBuffering, transport.isEnded, transport.isPlaying, transport.isSeekable, transport.isSeeking, transport.bufferedRanges, transport.cacheFill],
  );

  const model = useMemo(
    () => buildAudioViewModel(controllerState, transport.position, transport.duration),
    [controllerState, transport.duration, transport.position],
  );

  if (presentation !== 'expanded') return controller.bookmarkConfirmDialog;
  return (
    <>
      <AudioPlayer model={model} />
      {controller.bookmarkConfirmDialog}
    </>
  );
};

export type {AudioModuleProps};
