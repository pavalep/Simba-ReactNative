import React, {useCallback, useMemo} from 'react';
import {VideoPlayer} from './ui/VideoPlayer';
import {useVideoPlayerScreen} from './hooks/useVideoPlayerScreen';
import {VideoPlayerSurfaceLayer} from './components/VideoPlayerSurfaceLayer';
import {VideoPlayerTopBar} from './components/VideoPlayerTopBar';
import {PrimaryControls} from './components/PrimaryControls';
import {SecondaryToolbar} from './components/SecondaryToolbar';
import {VideoPlayerSubtitlePanel} from './components/VideoPlayerSubtitlePanel';
import {VideoPlayerAudioPanel} from './components/VideoPlayerAudioPanel';
import {VideoPlayerEqualizerPanel} from './components/VideoPlayerEqualizerPanel';
import {VideoPlayerVolumePanel} from './components/VideoPlayerVolumePanel';
import {VideoPlayerSpeedPanel} from './components/VideoPlayerSpeedPanel';
import {VideoPlayerPlaylistPanel} from './components/VideoPlayerPlaylistPanel';
import {VideoPlayerLoadingOverlay} from './components/VideoPlayerLoadingOverlay';
import {SeekFeedbackOverlay} from './components/SeekFeedbackOverlay';
import {VolumeBrightnessOverlay} from './components/VolumeBrightnessOverlay';
import type {ActivePlayback, PlaybackNavigation, VideoPlaybackParams} from '../types';
import {usePlaybackCommands} from '../PlaybackContext';

interface VideoPlayerModuleProps {
  active: ActivePlayback;
}

export const VideoPlayerModule: React.FC<VideoPlayerModuleProps> = ({active}) => {
  const {closePlayer, openPlayer} = usePlaybackCommands();

  const replaceVideo = useCallback(
    (params: VideoPlaybackParams) => {
      if (!params.fileUri) return;
      openPlayer({
        uri: params.fileUri,
        title: params.fileTitle ?? 'Untitled',
        duration: 0,
        source: params.source,
        type: params.type,
        mediaType: params.mediaType ?? 'video',
        provider: params.provider,
        folderId: params.folderId,
        startPosition: params.startPosition,
        liveChannels: params.liveChannels,
        liveChannelIndex: params.liveChannelIndex,
        initialError: params.initialError,
      });
    },
    [openPlayer],
  );

  const overlayNavigation = useMemo<PlaybackNavigation>(
    () => ({
      canGoBack: () => true,
      goBack: closePlayer,
      navigateHome: closePlayer,
      replaceVideo,
    }),
    [closePlayer, replaceVideo],
  );

  const route = useMemo<{params?: VideoPlaybackParams}>(
    () => ({
      params: {
        fileUri: active.entry.uri,
        fileTitle: active.entry.title,
        startPosition: active.startPosition,
        source: active.entry.source,
        type: active.entry.type,
        mediaType: active.entry.mediaType,
        provider: active.entry.provider,
        folderId: active.entry.folderId,
        liveChannels: active.liveChannels,
        liveChannelIndex: active.liveChannelIndex,
        initialError: active.initialError,
      },
    }),
    [active],
  );

  const hookData = useVideoPlayerScreen(overlayNavigation, route);

  return (
    <VideoPlayer
      {...hookData}
      VideoPlayerSurfaceLayer={VideoPlayerSurfaceLayer}
      VideoPlayerTopBar={VideoPlayerTopBar}
      PrimaryControls={PrimaryControls}
      SecondaryToolbar={SecondaryToolbar}
      VideoPlayerSubtitlePanel={VideoPlayerSubtitlePanel}
      VideoPlayerAudioPanel={VideoPlayerAudioPanel}
      VideoPlayerEqualizerPanel={VideoPlayerEqualizerPanel}
      VideoPlayerVolumePanel={VideoPlayerVolumePanel}
      VideoPlayerSpeedPanel={VideoPlayerSpeedPanel}
      VideoPlayerPlaylistPanel={VideoPlayerPlaylistPanel}
      VideoPlayerLoadingOverlay={VideoPlayerLoadingOverlay}
      SeekFeedbackOverlay={SeekFeedbackOverlay}
      VolumeBrightnessOverlay={VolumeBrightnessOverlay}
    />
  );
};
