import React, {useCallback, useMemo} from 'react';
import {TransportProvider, useTransport} from '../../../../contexts/TransportContext';
import {usePlaybackCommands} from '../../PlaybackContext';
import type {ActivePlayback, AudioPlaybackParams, PlaybackNavigation} from '../../types';
import {useAudioPlayerScreen} from '../hooks/useAudioPlayerScreen';
import {AudioV2Player} from './AudioV2Player';
import {buildAudioV2ViewModel, type AudioV2ControllerState} from './AudioV2Types';

interface AudioV2ModuleProps {
  active: ActivePlayback;
}

export const AudioV2Module: React.FC<AudioV2ModuleProps> = ({active}) => (
  <TransportProvider>
    <AudioV2Content active={active} />
  </TransportProvider>
);

const AudioV2Content: React.FC<AudioV2ModuleProps> = ({active}) => {
  const {collapsePlayer} = usePlaybackCommands();
  const transport = useTransport();

  const overlayNavigation = useMemo<PlaybackNavigation>(
    () => ({
      canGoBack: () => true,
      goBack: collapsePlayer,
      navigateHome: collapsePlayer,
    }),
    [collapsePlayer],
  );

  const route = useMemo<{params?: AudioPlaybackParams}>(
    () => ({
      params: {
        fileUri: active.entry.uri,
        fileTitle: active.entry.title,
        artworkUri: active.entry.artworkUri,
        source: active.entry.source,
        type: active.entry.type,
        mediaType: active.entry.mediaType,
        provider: active.entry.provider,
        folderId: active.entry.folderId,
        startPosition: active.startPosition,
        chapterList: active.chapterList,
        chapterIndex: active.chapterIndex,
      },
    }),
    [active],
  );

  const controller = useAudioPlayerScreen(overlayNavigation, route);

  const toggleBookmark = useCallback(() => {
    const existing = controller.audioBookmarksForFile[0];
    if (existing) {
      controller.handleBookmarkDelete(existing.id);
      return;
    }
    controller.handleBookmarkAdd();
  }, [controller.audioBookmarksForFile, controller.handleBookmarkAdd, controller.handleBookmarkDelete]);

  const controllerState = useMemo<AudioV2ControllerState>(
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
      isPlaying: transport.isPlaying || controller.isPlaying,
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
    [controller, toggleBookmark, transport.isPlaying],
  );

  const model = useMemo(
    () => buildAudioV2ViewModel(controllerState, transport.position, transport.duration),
    [controllerState, transport.duration, transport.position],
  );

  return <AudioV2Player model={model} />;
};

export type {AudioV2ModuleProps};
