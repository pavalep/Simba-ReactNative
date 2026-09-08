// ─── Music Screen — MusicDataProvider ───────────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE query
// instance — V18's per-scope cache lives in TanStack, not in this hook.
// Also owns the per-track press handler (uses the global `navigate`
// helper — content has no screen `navigation`).
//
// V18.3.3: the provider's API changes from "per-scope callbacks"
// (getScope(genre), ensureLoaded(genre), ...) to "single-scope
// data + actions" (items, fetchNextPage, setActiveGenre, ...).
// The content sets the active genre via setActiveGenre; the hook's
// useInfiniteApiQuery re-points the queryKey.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import { resolveStreamType, usePlayerActivity } from '@simba-dev/react-native-media-player';
import {useMusicScreen} from '../hooks/useMusicScreen';
import type {JamendoTrackResult} from '../../../types/api';

interface MusicDataContextValue {
  activeGenre: string;
  setActiveGenre: (genre: string) => void;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  items: JamendoTrackResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
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
  // Single hook instance for the whole screen.
  const music = useMusicScreen();
  const {openPlayer} = usePlayerActivity();

  const handleTrackPress = useCallback((item: JamendoTrackResult) => {
    openPlayer({
      uri: item.audioUrl,
      title: item.name,
      type: resolveStreamType('music'),
    });
  }, [openPlayer]);

  const value = useMemo<MusicDataContextValue>(
    () => ({
      activeGenre: music.activeGenre,
      setActiveGenre: music.setActiveGenre,
      setSearchTerm: music.setSearchTerm,
      isSearchActive: music.isSearchActive,
      items: music.items,
      hasLoaded: music.hasLoaded,
      isLoading: music.isLoading,
      isLoadingMore: music.isLoadingMore,
      hasNextPage: music.hasNextPage,
      error: music.error,
      fetchNextPage: music.fetchNextPage,
      refetch: music.refetch,
      handleTrackPress,
    }),
    [
      music.activeGenre,
      music.setActiveGenre,
      music.setSearchTerm,
      music.isSearchActive,
      music.items,
      music.hasLoaded,
      music.isLoading,
      music.isLoadingMore,
      music.hasNextPage,
      music.error,
      music.fetchNextPage,
      music.refetch,
      handleTrackPress,
    ],
  );

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};
