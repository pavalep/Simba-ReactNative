// ─── Music Screen — MusicDataProvider ───────────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE per-scope
// cache — the legacy "switching genres never refetches" behavior.
// Also owns the per-track press handler (uses the global `navigate`
// helper — content has no screen `navigation`).

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {usePlaybackCommands} from '../../../modules/playback';
import {useMusicScreen, type MusicScopeState} from '../hooks/useMusicScreen';
import type {JamendoTrackResult} from '../../../types/api';

interface MusicDataContextValue {
  isSearchActive: boolean;
  getScope: (genre: string) => MusicScopeState;
  ensureLoaded: (genre: string) => void;
  loadMore: (genre: string) => void;
  retry: (genre: string) => void;
  refresh: (genre: string) => void;
  setSearchTerm: (term: string) => void;
  handleTrackPress: (item: JamendoTrackResult) => void;
}

const MusicDataContext = React.createContext<MusicDataContextValue | null>(
  null,
);

function useMusicData(): MusicDataContextValue {
  const ctx = React.useContext(MusicDataContext);
  if (!ctx) {
    throw new Error('useMusicData must be used inside <MusicDataProvider>.');
  }
  return ctx;
}

export {useMusicData};

export const MusicDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (genre, searchTerm) scope cache via context.
  const music = useMusicScreen();
  const {openPlayer} = usePlaybackCommands();

  const handleTrackPress = useCallback((item: JamendoTrackResult) => {
    openPlayer({
      uri: item.audioUrl,
      title: item.name,
      duration: item.duration ?? 0,
      artworkUri: item.imageUrl,
      source: 'api',
      type: 'music',
      mediaType: 'audio',
      provider: 'jamendo',
    });
  }, [openPlayer]);

  // Stabilize the context value: depend on each property individually so
  // the memo only invalidates when one of them actually changes, not
  // every render (the `music` object is fresh each time).
  const value = useMemo<MusicDataContextValue>(
    () => ({
      isSearchActive: music.isSearchActive,
      getScope: music.getScope,
      ensureLoaded: music.ensureLoaded,
      loadMore: music.loadMore,
      retry: music.retry,
      refresh: music.refresh,
      setSearchTerm: music.setSearchTerm,
      handleTrackPress,
    }),
    [
      music.isSearchActive,
      music.getScope,
      music.ensureLoaded,
      music.loadMore,
      music.retry,
      music.refresh,
      music.setSearchTerm,
      handleTrackPress,
    ],
  );

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};
