import React, {createContext, useContext, useMemo, useRef, type ReactNode} from 'react';
import {usePlaybackCommands} from '../PlaybackContext';
import type {ActivePlayback, AudioPlaybackParams, PlaybackNavigation} from '../types';
import {useAudioPlayerScreen} from './hooks/useAudioPlayerScreen';

type AudioPlaybackController = ReturnType<typeof useAudioPlayerScreen>;

const AudioPlaybackControllerContext = createContext<AudioPlaybackController | null>(null);

interface AudioPlaybackControllerProviderProps {
  readonly active: ActivePlayback;
  readonly children: ReactNode;
}

function toAudioParams(active: ActivePlayback): AudioPlaybackParams {
  return {
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
  };
}

export const AudioPlaybackControllerProvider: React.FC<AudioPlaybackControllerProviderProps> = ({
  active,
  children,
}) => {
  const {collapsePlayer} = usePlaybackCommands();
  const navigation = useMemo<PlaybackNavigation>(
    () => ({
      canGoBack: () => true,
      goBack: collapsePlayer,
      navigateHome: collapsePlayer,
    }),
    [collapsePlayer],
  );
  const openRequestId = active.openRequestId ?? 0;
  const initialIntentRef = useRef({
    openRequestId,
    startPosition: active.startPosition,
  });
  if (initialIntentRef.current.openRequestId !== openRequestId) {
    initialIntentRef.current = {
      openRequestId,
      startPosition: active.startPosition,
    };
  }
  const controllerActive = useMemo(
    () => ({...active, startPosition: initialIntentRef.current.startPosition}),
    [active],
  );
  const route = useMemo(() => ({params: toAudioParams(controllerActive)}), [controllerActive]);
  const controller = useAudioPlayerScreen(navigation, route);

  return (
    <AudioPlaybackControllerContext.Provider value={controller}>
      {children}
    </AudioPlaybackControllerContext.Provider>
  );
};

export function useAudioPlaybackController(): AudioPlaybackController {
  const controller = useContext(AudioPlaybackControllerContext);
  if (!controller) {
    throw new Error('useAudioPlaybackController must be used inside AudioPlaybackControllerProvider');
  }
  return controller;
}

export type {AudioPlaybackController};
export default AudioPlaybackControllerProvider;
