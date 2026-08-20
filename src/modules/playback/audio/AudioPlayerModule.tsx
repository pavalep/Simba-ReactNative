import React, {useMemo} from 'react';
import {AudioPlayer} from './ui/AudioPlayer';
import {useAudioPlayerScreen} from './hooks/useAudioPlayerScreen';
import type {ActivePlayback, AudioPlaybackParams, PlaybackNavigation} from '../types';
import {usePlaybackCommands} from '../PlaybackContext';

interface AudioPlayerModuleProps {
  active: ActivePlayback;
}

export const AudioPlayerModule: React.FC<AudioPlayerModuleProps> = ({active}) => {
  const {collapsePlayer} = usePlaybackCommands();

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

  const hookData = useAudioPlayerScreen(overlayNavigation, route);
  return <AudioPlayer {...hookData} />;
};
