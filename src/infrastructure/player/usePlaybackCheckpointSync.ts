import {useEffect, useRef} from 'react';
import {useNowPlayingStore, type NowPlaying} from '../../state/nowPlayingStore';
import {addRecent} from '../../features/recentHistory';
import {
  CHECKPOINT_INTERVAL_MS,
  shouldRecordCheckpoint,
} from './playbackProgress';
import {useTransport} from './useTransport';

/**
 * W9.4 — the resume checkpoint WRITER.
 *
 * ## What this replaces
 *
 * Nothing. That is the point, and it is why "Recently Played" has been
 * permanently empty.
 *
 * `recentHistoryStore` has been read by Home, History, Stats, Search,
 * Profile and two detail screens since V17, and written by nothing.
 * `upsertRecentHistoryEntry` was reachable only from
 * `features/recentHistory/index.ts`; not one of its ~8 consumers calls
 * `addRecent`, and the non-React `addRecent()` had no callers at all.
 * The writer had in fact been *deleted* — `services/recentHistoryService.ts`
 * is now an empty module whose own docblock says
 * `"recordPlaybackCheckpoint … was unused by any consumer. Removed."`
 *
 * The consumer-facing half of the feature (shelf, empty state, the
 * `isInProgress` "time left" badge, the History screen) was fully built
 * and fully waiting for a producer that had been removed.
 *
 * ## Where it is mounted, and why it matters
 *
 * Mounted in `ActivityShell`, **not** in `AppContent`. `AppContent`
 * renders as `{isPlayerActivity ? null : <AppContent />}`, so a hook
 * mounted there does not run in the player activity — which is exactly
 * where playback happens. `useQueueSync` is mounted there today and has
 * therefore never observed a real playback session.
 *
 * ## Rate limiting
 *
 * The history store is persisted to MMKV, so a checkpoint is a storage
 * write, not a memory write. `positionMs` advances 4x/second, so a tick
 * is compared against a clock and only a real interval writes.
 *
 * The position is read from `state.positionMs`, which the W9 performance
 * work already rate-limited at the **native** layer (250 ms coalescing in
 * the lib's C++ event pump). This hook adds no bridge traffic of its own
 * — it only reacts to state it is already given.
 */

/** Everything a checkpoint needs, captured at one instant. */
interface Snapshot {
  readonly positionMs: number;
  readonly durationMs: number;
  readonly isPlaying: boolean;
  readonly session: NowPlaying | null;
}

/**
 * The single place a checkpoint is turned into a history write.
 *
 * One function rather than one per call site: the admission rule
 * (`shouldRecordCheckpoint`) and the field mapping must not be able to
 * drift apart between the periodic path and the flush-on-exit path,
 * because "resume works but the final position is lost" is exactly the
 * bug that duplication of this shape produces.
 *
 * Returns whether a write happened, so the caller can update its
 * rate-limit bookkeeping only when the store was actually touched.
 */
function writeCheckpoint(snapshot: Snapshot): boolean {
  const {session} = snapshot;
  if (!session || !snapshot.isPlaying) return false;

  const positionSec = snapshot.positionMs / 1000;
  const durationSec = snapshot.durationMs / 1000;
  if (!shouldRecordCheckpoint({positionSec, durationSec})) return false;

  addRecent({
    fileUri: session.uri,
    title: session.title,
    position: positionSec,
    duration: durationSec,
    ...(session.thumbnailPath ? {thumbnailPath: session.thumbnailPath} : {}),
    ...(session.type ? {type: session.type} : {}),
    ...(session.mediaLane ? {mediaType: session.mediaLane} : {}),
    ...(session.provider ? {provider: session.provider} : {}),
  });
  return true;
}

/** Injected so tests can drive the clock without fake timers. */
type Clock = () => number;

export function usePlaybackCheckpointSync(now: Clock = Date.now): void {
  const {state} = useTransport();
  const nowPlaying = useNowPlayingStore(s => s.current);

  // Latest values in a ref, so the interval effect is created once for
  // the component's lifetime. Listing them as dependencies would tear
  // the timer down and rebuild it on every 4 Hz position tick, which
  // would reset the 30 s countdown every time and mean the checkpoint
  // never fires at all.
  const snapshotRef = useRef<Snapshot>({
    positionMs: state.positionMs,
    durationMs: state.durationMs,
    isPlaying: state.isPlaying,
    session: nowPlaying,
  });
  snapshotRef.current = {
    positionMs: state.positionMs,
    durationMs: state.durationMs,
    isPlaying: state.isPlaying,
    session: nowPlaying,
  };

  const lastWriteRef = useRef<{uri: string; at: number} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = snapshotRef.current;
      const session = snapshot.session;
      if (!session) return;

      const at = now();
      const last = lastWriteRef.current;
      // Keyed on URI as well as time: relaunching the same film right
      // after closing it must not inherit the previous session's
      // timestamp and skip its first 30 s of checkpoints.
      if (
        last &&
        last.uri === session.uri &&
        at - last.at < CHECKPOINT_INTERVAL_MS
      ) {
        return;
      }

      if (writeCheckpoint(snapshot)) {
        lastWriteRef.current = {uri: session.uri, at};
      }
    }, CHECKPOINT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [now]);

  // Flush on teardown so "watched to 29:59, pressed back" does not
  // resume at 29:30. Cleanup-only, so this runs exactly once per
  // session — on switch, on close, or on the activity going away — and
  // never duplicates the periodic path's last write.
  const sessionId = nowPlaying?.sessionId ?? null;

  useEffect(() => {
    return () => {
      writeCheckpoint(snapshotRef.current);
    };
  }, [sessionId]);
}