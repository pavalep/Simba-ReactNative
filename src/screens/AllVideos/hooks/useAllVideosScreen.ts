// ─── All Videos — data hook ────────────────────────────────────────────
//
// WAVE B16 (Wave B2) — rewritten.
//
// The hook used to own the page's scope as its own `useState`: the sort
// was a toggle, the view was another toggle, and the search term was a
// third. Three owners for one page's scope.
//
// The scope now belongs to the OPTION MODEL (the shared
// `useSectionOptions`), and the shell's search field owns the term.
// This hook is a pure function of that scope: it reads the media store
// and returns the list the scope asks for.

import {useCallback, useMemo} from 'react';
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {
  isBlockedError,
  isExpiredError,
  isLaunchError,
  isNetworkError,
  isUnsupportedError,
  usePlay,
} from '../../../infrastructure/player';
import {useToast} from '../../../components/feedback/Toast';
import {useMediaVideoTracks, type ScannedTrack} from '../../../state';
import text from '../related/textContent.json';

/**
 * The artist a track is filed under.
 *
 * The media store's own catalogue uses the same fallback
 * (`useMediaArtists` → `t.artist || 'Unknown Artist'`), so the row and
 * the catalogue cannot disagree about an unnamed track.
 */
export function artistNameOf(track: ScannedTrack): string {
  return track.artist || 'Unknown Artist';
}

export interface UseAllVideosScreenParams {
  /** The shell's debounced search term. */
  query?: string;
  /** The effective sort — 'title' | 'year'. */
  sort?: string;
};

export interface UseAllVideosScreenResult {
  /** Every scanned video track on the device. */
  videoTracks: ScannedTrack[];
  /** The tracks the scope shows. */
  visibleTracks: ScannedTrack[];
  /** The order the list is in — the sort group's own label. */
  sortLabel: string;
  /** Play a track. */
  playTrack: (track: ScannedTrack) => void;
  /** The scan's state — the pull-to-refresh spinner. */
  refreshing: boolean;
  /** Run a full re-scan of the linked folders. */
  refresh: () => void;
};

export function useAllVideosScreen({
  query = '',
  sort = 'title',
}: UseAllVideosScreenParams = {}): UseAllVideosScreenResult {
  // V21 typed facade — awaited + Result pattern-match so the
  // 4 failure variants (network / unsupported / expired / blocked)
  // surface as toasts. Pre-V21: direct `openPlayer()` call returned
  // Promise<boolean>; rejection became an unhandled promise rejection,
  // `false` discarded.
  const play = usePlay();
  const toast = useToast();
  // V20.10: `isScanning` comes from the media-scan store directly
  // (via `useMediaScanner()`). No local `refreshing` state — the
  // scan-in-flight boolean is the single source of truth.
  const {startScan, isScanning} = useMediaScanner();

  const videoTracks = useMediaVideoTracks();

  const visibleTracks = useMemo(() => {
    let result = [...videoTracks];

    // The search term — the shell's field, debounced by the shell.
    const term = query.trim().toLowerCase();
    if (term) {
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(term) ||
          artistNameOf(t).toLowerCase().includes(term) ||
          (t.album || '').toLowerCase().includes(term),
      );
    }

    // The sort.
    result.sort((a, b) => {
      if (sort !== 'year') return a.title.localeCompare(b.title);
      // The year sort breaks ties on the TITLE: without it, two videos
      // from the same year keep the device's scan order, so the list's
      // order would change with the folder the media was found in.
      if (b.year !== a.year) return b.year - a.year;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [videoTracks, query, sort]);

  const playTrack = useCallback(
    async (track: ScannedTrack) => {
      const result = await play({
        uri: track.uri,
        title: track.title,
        mediaType: 'video',
      });
      if (result.ok) return;
      if (isNetworkError(result.error)) {
        toast.show(
          'No connection. The video will open when you are online.',
          'warning',
          {duration: 6000},
        );
      } else if (isUnsupportedError(result.error)) {
        toast.show(
          'This video format is not supported by the player.',
          'error',
          {duration: 6000},
        );
      } else if (isExpiredError(result.error)) {
        toast.show('Sign in expired. Please sign in again.', 'warning', {
          duration: 6000,
        });
      } else if (isBlockedError(result.error)) {
        toast.show('This content is not available in your region.', 'error', {
          duration: 6000,
        });
      } else if (isLaunchError(result.error)) {
        // B-009: surface the typed bridge rejection code.
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

  // 54.3: pull-to-refresh — force a full re-scan of linked folders.
  const refresh = useCallback(() => {
    startScan(true);
  }, [startScan]);

  return {
    videoTracks,
    visibleTracks,
    sortLabel: sort === 'year' ? text.sort.year : text.sort.title,
    playTrack,
    refreshing: isScanning,
    refresh,
  };
}