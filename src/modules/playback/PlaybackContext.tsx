import React, {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {normalizePlaybackEntry} from '../../types/playback';
import {
  getPlaybackLane,
  toPlaybackEntryInput,
  type ActivePlayback,
  type PlaybackContextValue,
  type PlaybackOpenRequest,
  type PlaybackPresentation,
} from './types';

const PlaybackStateContext = createContext<PlaybackContextValue | null>(null);
let nextOpenRequestId = 0;

export interface PlaybackProviderProps {
  children: ReactNode;
}

export const PlaybackProvider: React.FC<PlaybackProviderProps> = ({children}) => {
  const [active, setActive] = useState<ActivePlayback | null>(null);

  const openPlayer = useCallback((request: PlaybackOpenRequest) => {
    const entry = normalizePlaybackEntry({
      ...toPlaybackEntryInput(request),
      mediaType: request.mediaType ?? request.mediaLane,
    });

    nextOpenRequestId += 1;
    setActive({
      entry,
      presentation: 'expanded',
      openRequestId: nextOpenRequestId,
      startPosition: request.startPosition ?? request.resumePosition,
      chapterList: request.chapterList,
      chapterIndex: request.chapterIndex,
      liveChannels: request.liveChannels,
      liveChannelIndex: request.liveChannelIndex,
      initialError: request.initialError,
    });
  }, []);

  const setPresentation = useCallback((presentation: PlaybackPresentation) => {
    setActive(current => {
      if (!current) return current;
      if (presentation === 'none') return null;
      return {...current, presentation};
    });
  }, []);

  const expandPlayer = useCallback(() => setPresentation('expanded'), [setPresentation]);
  const collapsePlayer = useCallback(() => {
    setActive(current => {
      if (!current) return current;
      // `startPosition` is an initial open intent, not presentation state.
      // Once the full player has been collapsed, mini expansion must preserve
      // the native item and position instead of replaying that old timestamp.
      return {...current, presentation: 'mini', startPosition: undefined};
    });
  }, []);
  const closePlayer = useCallback(() => setPresentation('none'), [setPresentation]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      active,
      openPlayer,
      expandPlayer,
      collapsePlayer,
      closePlayer,
    }),
    [active, closePlayer, collapsePlayer, expandPlayer, openPlayer],
  );

  return <PlaybackStateContext.Provider value={value}>{children}</PlaybackStateContext.Provider>;
};

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackStateContext);
  if (!context) {
    throw new Error('usePlayback must be used inside PlaybackProvider');
  }
  return context;
}

export function usePlaybackState() {
  const {active} = usePlayback();
  return {
    active,
    presentation: active?.presentation ?? 'none',
    lane: active ? getPlaybackLane(active) : null,
  };
}

export function usePlaybackCommands() {
  const {openPlayer, expandPlayer, collapsePlayer, closePlayer} = usePlayback();
  return {openPlayer, expandPlayer, collapsePlayer, closePlayer};
}
