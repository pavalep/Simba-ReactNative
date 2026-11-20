// ─── All Audio — data hook ───────────────────────────────────────────────
//
// WAVE B16 (Wave B) — rewritten.
//
// The hook used to own the page's scope as its own `useState`: the sort
// was a toggle, the view was another toggle, and the search term was a
// third. Three owners for one page's scope — and the route's params
// were a fourth, read here and applied here.
//
// The scope now belongs to the OPTION MODEL (the shared
// `useSectionOptions`), and the shell's search field owns the term.
// This hook is a pure function of that scope: it reads the media store
// and returns the list the scope asks for.

import {useCallback, useMemo} from 'react';
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {
  resolveStreamType,
  useResumeAwareLaunch,
} from '../../../infrastructure/player';
import {useMediaAudioTracks, type ScannedTrack} from '../../../state';
import {artistNameOf} from '../related/browseConfig';
import text from '../related/textContent.json';

export interface UseAllAudioScreenParams {
  /** The artist the page is scoped to ('' = every artist). */
  artist?: string;
  /** The shell's debounced search term. */
  query?: string;
  /** The effective sort — 'title' | 'artist'. */
  sort?: string;
}

export interface UseAllAudioScreenResult {
  /** Every scanned audio track on the device. */
  tracks: ScannedTrack[];
  /** The tracks the scope shows. */
  visibleTracks: ScannedTrack[];
  /** The scope's artist ('' when the page shows every artist). */
  scopeArtist: string;
  /** The order the list is in — the sort group's own label. */
  sortLabel: string;
  /** Play a track. */
  playTrack: (track: ScannedTrack) => void;
  /** The scan's state — the pull-to-refresh spinner. */
  refreshing: boolean;
  /** Run a full re-scan of the linked folders. */
  refresh: () => void;
}

/**
 * The All Audio page's data.
 *
 * The route's `sort` and `filter` params are no longer read HERE. They
 * are read by the option model — the `sort` param seeds the sort group,
 * and the `filter` param seeds the artist group — and reach this hook
 * as the scope the shell owns. A param that the screen ignored was a
 * promise the app did not keep; a param with two owners is a promise
 * two pages can keep differently.
 */
export function useAllAudioScreen({
  artist = '',
  query = '',
  sort = 'title',
}: UseAllAudioScreenParams = {}): UseAllAudioScreenResult {
  const {openPlayer} = useResumeAwareLaunch();
  // V20.10: `isScanning` comes from the media-scan store directly
  // (via `useMediaScanner()`). No local `refreshing` state — the
  // scan-in-flight boolean is the single source of truth.
  const {startScan, isScanning} = useMediaScanner();

  const tracks = useMediaAudioTracks();

  const visibleTracks = useMemo(() => {
    let result = [...tracks];

    // The ARTIST scope — the Artist screen's "view all tracks" sends
    // the artist's name, and the page is that artist's tracks. The
    // match is on the ARTIST, case-insensitively: the caller sends
    // the name it knows the track by.
    const wanted = artist.trim().toLowerCase();
    if (wanted) {
      result = result.filter(t => artistNameOf(t).toLowerCase() === wanted);
    }

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
      if (sort !== 'artist') return a.title.localeCompare(b.title);
      // The artist sort breaks ties on the TITLE: without it, two
      // tracks by the same artist keep the device's scan order, so the
      // list's order would change with the folder the media was found
      // in.
      const byArtist = artistNameOf(a).localeCompare(artistNameOf(b));
      return byArtist !== 0 ? byArtist : a.title.localeCompare(b.title);
    });

    return result;
  }, [tracks, artist, query, sort]);

  const playTrack = useCallback(
    (track: ScannedTrack) => {
      openPlayer({
        uri: track.uri,
        title: track.title,
        type: resolveStreamType(track.mediaType),
      });
    },
    [openPlayer],
  );

  // 54.3: pull-to-refresh — force a full re-scan of linked folders.
  const refresh = useCallback(() => {
    startScan(true);
  }, [startScan]);

  return {
    tracks,
    visibleTracks,
    scopeArtist: artist.trim(),
    sortLabel: sort === 'artist' ? text.sort.artist : text.sort.title,
    playTrack,
    refreshing: isScanning,
    refresh,
  };
}
