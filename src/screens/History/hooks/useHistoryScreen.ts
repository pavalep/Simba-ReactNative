// ─── History — data hook ───────────────────────────────────────────────
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page's data, its scope and its three actions lived in the screen
// component itself. The scope now belongs to the OPTION MODEL (the
// shared `useSectionOptions`) and the shell's search field owns the
// term, so this hook is a pure function of that scope: it reads the
// history store and returns the list the scope asks for.
//
// ── No pull-to-refresh ──────────────────────────────────────────────
// 54.3 shipped a `RefreshControl` whose handler flipped a boolean for
// one animation frame and re-read nothing: the History list is fed by
// a live persisted store, so there is nothing to refresh. The control
// was a spinner that never fetched anything — the same reasoning that
// already removed Home's pull-to-refresh (spec §6.3.3,
// `md/CONTENT_OWNERSHIP.md`).

import {useCallback, useMemo} from 'react';
import {useToast} from '../../../components/feedback/Toast';
import {
  isBlockedError,
  isExpiredError,
  isNetworkError,
  isUnsupportedError,
  usePlayWithResume,
} from '../../../infrastructure/player';
import {useRecentHistory, type RecentHistoryEntry} from '../../../features/recentHistory';

export interface UseHistoryScreenParams {
  /** The media-type scope — 'all' | 'video' | 'audio' | 'streaming'. */
  filter?: string;
  /** The shell's debounced search term. */
  query?: string;
};

export interface UseHistoryScreenResult {
  /** The entries the scope shows. */
  visibleEntries: RecentHistoryEntry[];
  /** Resume an entry at its saved position. */
  playEntry: (entry: RecentHistoryEntry) => void;
  /** Remove one entry — the caller confirms first. */
  removeEntry: (fileUri: string) => void;
  /** Remove every entry — the caller confirms first. */
  clearAll: () => void;
};

/** 47.3: streaming = remote URIs (http/https), local = file/content. */
export function isStreamingUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

export function useHistoryScreen({
  filter = 'all',
  query = '',
}: UseHistoryScreenParams = {}): UseHistoryScreenResult {
  // W7 P26: `usePlayWithResume` replaces the direct `useResumeAwareLaunch().openPlayer`
  // call. Pre-P26, the press handler was passing `startPositionMs: position`
  // where `position` is in SECONDS (the history store's convention) but the
  // bridge field expects MILLISECONDS — every resume seek was 1000x too small.
  // The new hook handles the seconds→ms conversion in one place.
  // W22 F/U: the hook now returns `Result<PlaybackId, StreamError>` —
  // the press handler branches on the 4 variants (Network / Unsupported /
  // Expired / Blocked) using the shared type guards imported above.
  const playWithResume = usePlayWithResume();
  const toast = useToast();
  const {list, removeRecent, clearRecent} = useRecentHistory();

  const visibleEntries = useMemo(() => {
    let items = list;
    if (filter === 'video') {
      items = items.filter(e => e.mediaType === 'video');
    } else if (filter === 'audio') {
      items = items.filter(e => e.mediaType === 'audio');
    } else if (filter === 'streaming') {
      items = items.filter(e => isStreamingUri(e.fileUri));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(e => e.title.toLowerCase().includes(q));
    }
    return items;
  }, [list, filter, query]);

  const playEntry = useCallback(
    (entry: RecentHistoryEntry) => {
      // 58.2: explicit tap intent — silent seek to the saved position.
      // W22 (item 38): the lane, title and position are REQUIRED here.
      // `RecentHistoryEntry` declares all three as non-optional
      // (`mediaType: MediaLane`, `title: string`, `position: number`),
      // and the single call site passes `item.mediaType`, `item.title`
      // and `item.position` — so an old `?? 'video'` / `?? 'Untitled'` /
      // `?? 0` fallback could never fire. A `?? 'video'` on a required
      // lane is worse than dead code: it reads as "this file might have
      // no lane" and invites a caller to drop the argument.
      void playWithResume({
        uri: entry.fileUri,
        title: entry.title,
        mediaType: entry.mediaType,
        positionSec: entry.position,
      }).then(r => {
        if (r.ok) return;
        if (isNetworkError(r.error)) {
          toast.show('No connection. History resume will play when online.', 'warning');
        } else if (isUnsupportedError(r.error)) {
          toast.show('This file format is not supported.', 'error');
        } else if (isExpiredError(r.error)) {
          toast.show('Sign in expired. Please sign in again.', 'warning');
        } else if (isBlockedError(r.error)) {
          toast.show('This content is not available in your region.', 'error');
        } else {
          toast.show('Could not resume playback.', 'error');
        }
      });
    },
    [playWithResume, toast],
  );

  const removeEntry = useCallback(
    (fileUri: string) => {
      removeRecent(fileUri);
    },
    [removeRecent],
  );

  const clearAll = useCallback(() => {
    clearRecent();
  }, [clearRecent]);

  return {visibleEntries, playEntry, removeEntry, clearAll};
}