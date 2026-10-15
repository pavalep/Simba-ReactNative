/**
 * V19 W0 Phase 0.1 — `useQueueSync()` middleware (FOUNDATIONAL).
 *
 * The wire between the launch seam's session record and the consumer's
 * `usePlayerStore.currentFile`. Every consumer that asks "is this track
 * the one playing?" reads `currentFile?.uri` — the Library waveform
 * (`useLibraryScreen.ts:103`), Album and Artist (`isCurrentTrack`), and
 * ArtistDetail all compare against it.
 *
 * Mounted ONCE at `ActivityShell`, next to `usePlaybackCheckpointSync`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.22 + the audit doc §3.C.
 *
 * ## V21 F5 A6 — the entry is DERIVED from the session, not fabricated
 *
 * This hook used to rebuild `currentFile` out of the lib's lossy session
 * state and three literals:
 *
 * ```ts
 * {uri: '', duration: 0, source: 'local', type: 'audio',
 *  mediaType: 'audio' as MediaLane}
 * ```
 *
 * Three things were wrong with that, and the first one broke the UI.
 *
 *  1. **`uri: ''` destroyed the value it was supposed to mirror.**
 *     `loadPlaylistToPlayer` writes a real `currentFile` on every
 *     playlist launch — then the very first lib state tick replaced it
 *     with this entry, whose `uri` was the empty string. Every consumer
 *     compares `currentFile?.uri` against a real track URI, and `''`
 *     matches none, so the "now playing" indicator went dark on every
 *     playlist launch and every single-track launch. It also made
 *     `currentAudioUri` (`useLibraryScreen.ts:103`) `''` rather than
 *     `null`, i.e. non-null-but-empty.
 *
 *  2. **`type`/`mediaType` were hardcoded to audio.** A video session
 *     produced an entry claiming `audio`, so `activeLane`
 *     (`playerStore.ts:104`) reported the wrong lane for video.
 *
 *  3. **`duration: 0` was never true**, and the docblock claimed the
 *     lib "doesn't expose the original URI". Both statements were false:
 *     `PlayerState` carries `durationMs`, and `useResumeAwareLaunch`
 *     — which owns the URI by construction, since it is what `openPlayer`
 *     was called with — records it in `useNowPlayingStore`.
 *
 * The fix is not a better guess. It is to read the record that already
 * exists. `useNowPlayingStore.current` is written by the launch seam on
 * every launch, for both lanes, and cleared by `end()`. This hook was
 * the last place still inventing playback metadata it could simply ask
 * for.
 *
 * ## Lane is derived, never stored
 *
 * The entry is classified through `normalizeMediaClassification`, so
 * `mediaType` remains a pure function of `type` — the same authority the
 * rest of the app uses. `session.type` is the semantic kind when the
 * launching screen knew it; `session.streamType` is the `'audio' |
 * 'video'` the bridge was actually asked for, and is a valid `MediaKind`
 * spelling, so it round-trips through the normaliser unchanged.
 */

import {useEffect, useRef} from 'react';
import {usePlayer} from '@simba-dev/react-native-media-player';
import {usePlayerStore, type PlaylistEntry} from '../../state/playerStore';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {normalizeMediaClassification} from '../../types/media';

/**
 * Mounted once. Returns nothing — side-effect-only hook.
 *
 * Usage (`ActivityShell`):
 *   useQueueSync();
 */
export function useQueueSync(): void {
  const {state} = usePlayer();
  // The session record the launch seam wrote. `null` means nothing is
  // loaded — the same condition `PlayerChrome` gates on, so there is one
  // owner of "is a track loaded" and this hook reads it rather than
  // re-deriving it from the lib's `state.title` heuristic.
  const session = useNowPlayingStore(s => s.current);

  // Stable refs to the store actions (avoid stale closures).
  const setCurrentFileRef = useRef(usePlayerStore.getState().setCurrentFile);
  const clearPlaylistRef = useRef(usePlayerStore.getState().clearPlaylist);

  // V21 F5 A6 — derive `currentFile` from the session.
  //
  // `duration` is derived from the lib's `durationMs` and rounded to
  // SECONDS, which is the unit `ScannedTrack.duration` and
  // `PlaylistItem.duration` both use. No consumer reads `duration` off
  // `currentFile` today, so this is honest rather than load-bearing —
  // but `0` was never true, and a field that always lies is how the next
  // consumer gets it wrong.
  useEffect(() => {
    if (session == null) {
      clearPlaylistRef.current();
      return;
    }

    const entry: PlaylistEntry = {
      uri: session.uri,
      title: session.title,
      duration: Math.round(state.durationMs / 1000),
      ...normalizeMediaClassification({
        // `type` first; `streamType` is the fallback and is itself a
        // valid `MediaKind` spelling, so it round-trips unchanged.
        type: session.type ?? session.streamType,
      }),
    };
    setCurrentFileRef.current(entry);
  }, [session, state.durationMs]);

  // ── next/previous: the lib's `commands.next` / `commands.previous`
  // fire internally and this hook does not observe them. Consumers that
  // know the index changed call `usePlayerStore.playFromPlaylist(idx)`.
  // `usePlayerStore.playlist` — not the lib's queue — is what the Queue
  // screen renders.
}
