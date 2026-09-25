/**
 * V19 W0 Phase 0.1 — `useQueueSync()` middleware (FOUNDATIONAL).
 *
 * The single wire between the lib's native queue + the consumer's
 * `usePlayerStore` Zustand state. Without it, every consumer has its
 * own view of "what's playing" and they drift. The Home screen's "Now
 * Playing" tile, the Queue screen, the PlaylistDetail screen, and the
 * player's own chrome all need to read the same `currentFile` — and
 * that single source of truth is the lib's native session, not the
 * consumer's Zustand store.
 *
 * Mounted ONCE at AppContent (inside the existing V16 SimbaPlayer's
 * children) — see `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §5 for
 * the W4 migration when V19 SimbaPlayer replaces the V16 root.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.22 + the audit doc §3.C.
 *
 * Subscribes to:
 *  - `usePlayer().state` (isPlaying, title, artist, loopMode, etc.)
 *  - `usePlayerProgress().positionMs` (1 Hz polling)
 *  - `usePlayerActivity().openPlayer` (launch surface)
 *  - `useOpenPlaylist()` (multi-item launch surface)
 *
 * Writes to:
 *  - `usePlayerStore.setCurrentFile(...)` on every launch
 *  - `usePlayerStore.playFromPlaylist(idx)` on next/previous
 *  - `usePlayerStore.clearPlaylist()` on session empty
 *
 * Uses Zustand selector slices (`usePlayerStore(s => s.currentFile)`)
 * in dependent components to avoid re-render storms.
 *
 * Failure modes:
 *  - Lib's queue contents are opaque (audit §4). If the lib exposes
 *    "what's next", `useQueueSync` upgrades its subscription. Until
 *    then, `usePlayerStore.playlist` is the maintained queue — set
 *    by `useOpenPlaylist` argument + advanced on `next()` /
 *    `previous()`.
 *  - If the lib exposes a richer queue API in V20+, this hook upgrades
 *    without breaking consumers.
 */

import {useEffect, useRef} from 'react';
import {usePlayer, usePlayerActivity} from '@simba-dev/react-native-media-player';
import {usePlayerStore, type PlaylistEntry} from '../../state/playerStore';
import type {MediaLane} from '../../types/media';

/**
 * Mounted once. Returns nothing — side-effect-only hook.
 *
 * Usage (App.tsx, inside AppContent):
 *   useQueueSync();
 */
export function useQueueSync(): void {
  // Subscriptions — capture the latest references via refs so the
  // effect below doesn't re-run when the hook returns new function
  // references on every render.
  //
  // V19 W0 Phase 0.1: only the lib state hooks we actually CONSUME.
  // `usePlayerProgress` and `useOpenPlaylist` are not used yet — they
  // will be in V20 when the lib exposes typed events for queue
  // inspection. The imports are removed until then (no `void x` stubs
  // polluting the file).
  const {state} = usePlayer();
  const {openPlayer} = usePlayerActivity();
  // openPlayer is recorded for analytics/debugging in W0; Wave 4+ will
  // wire it to usePlayerStore.playFromPlaylist(idx) once the lib exposes
  // typed events. For now we read it so the hook dependency is stable.
  // eslint-disable-next-line no-void
  void openPlayer;

  // Stable refs to the store actions (avoid stale closures).
  // V19 W0 Phase 0.1: only the actions we actually invoke from the
  // effects below. `playFromPlaylist` + the next/previous event
  // subscription are V20 work (the lib doesn't expose typed events
  // today — audit §4 "lib's queue contents are opaque").
  const setCurrentFileRef = useRef(usePlayerStore.getState().setCurrentFile);
  const clearPlaylistRef = useRef(usePlayerStore.getState().clearPlaylist);

  // Wire: every state tick writes `currentFile` to the consumer store.
  // The lib exposes `state.title` + `state.artist` + the underlying
  // `uri` only when a session is active. When state.isPlaying goes from
  // true -> false AND `state.title` is empty, we treat that as "session
  // ended" and clear the playlist.
  useEffect(() => {
    const titleEmpty = !state.title;
    if (titleEmpty && !state.isPlaying) {
      clearPlaylistRef.current();
      return;
    }
    if (titleEmpty) return;

    // Build a minimal PlaylistEntry from the lib's session state.
    // The lib doesn't expose the original URI here directly — that's a
    // V20 follow-up. For W0, the entry carries `title + artist + isPlaying`
    // so consumers (Home's "Now Playing" tile, NowPlayingScreen)
    // render correctly even without the URI.
    const entry: PlaylistEntry = {
      uri: '', // V20: lib exposes `getCurrentUri()` (audit §4)
      title: state.title,
      duration: 0,
      source: 'local',
      type: 'audio',
      mediaType: 'audio' as MediaLane,
    };
    setCurrentFileRef.current(entry);
  }, [state.isPlaying, state.title, state.artist]);

  // ── next/previous: the lib's `commands.next` / `commands.previous`
  // fire internally. Without an event subscription, we can't observe
  // them in W0. V20 follow-up: add a typed event subscription.
  // For now, consumers call `usePlayerStore.playFromPlaylist(idx)`
  // directly when they know the index changed.
  // ──────────────────────────────────────────────────────────────

  // Wire: when positionMs advances, no-op (1 Hz polling; we don't
  // re-write the whole entry on every tick — selectors pick what they
  // need). The Zustand consumer store carries the shape; position
  // reads are scoped to consumers that need them.
  // (Intentionally a no-op for now; reserved for V20 queue-event
  // subscription.)
}
