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
import {usePlay} from '../../../infrastructure/player';
import {useMusicScreen} from '../hooks/useMusicScreen';
import {useToast} from '../../../components/feedback/Toast';
import {
  isBlockedError,
  isExpiredError,
  isLaunchError,
  isNetworkError,
  isUnsupportedError,
} from '../../../infrastructure/player';
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
  const play = usePlay();
  const toast = useToast();

  const handleTrackPress = useCallback(
    async (item: JamendoTrackResult) => {
      // V21 typed facade — awaited + Result pattern-match so the
      // 4 failure variants (network / unsupported / expired /
      // blocked) surface as toasts instead of being swallowed.
      // Pre-V21: direct usePlayerActivity().openPlayer() call
      // returned a Promise<boolean>; rejection became unhandled
      // promise rejection, `false` was discarded silently.
      const result = await play({
        uri: item.audioUrl,
        title: item.name,
        mediaType: 'music',
      });
      if (result.ok) return;
      if (isNetworkError(result.error)) {
        toast.show(
          'No connection. The track will open when you are online.',
          'warning',
          {duration: 6000},
        );
      } else if (isUnsupportedError(result.error)) {
        toast.show(
          'This audio format is not supported by the player.',
          'error',
          {duration: 6000},
        );
      } else if (isExpiredError(result.error)) {
        toast.show('Sign in expired. Please sign in again.', 'warning', {
          duration: 6000,
        });
      } else if (isBlockedError(result.error)) {
        toast.show(
          'This content is not available in your region.',
          'error',
          {duration: 6000},
        );
      } else if (isLaunchError(result.error)) {
        // B-009: player activity refused to launch. Surface the
        // typed bridge rejection code so users can report it.
        const detail = result.error.code ? ` [${result.error.code}]` : '';
        toast.show(
          `Player couldn’t start${detail ? ` — ${detail}` : ''}. ${result.error.message}`,
          'error',
          {duration: 8000},
        );
      } else {
        toast.show(
          'Could not open the player. Please try again.',
          'error',
          {duration: 6000},
        );
      }
    },
    [play, toast],
  );

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
