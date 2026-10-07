import {useEffect, useRef} from 'react';
import {captureFrame} from '@simba-dev/react-native-media-player';
import {useNowPlayingStore, type NowPlaying} from '../../state/nowPlayingStore';
import {addRecent} from '../../features/recentHistory';
import {logger} from '../../lib/logger';
import {
  CHECKPOINT_INTERVAL_MS,
  RESUME_THUMB_HEIGHT,
  RESUME_THUMB_WIDTH,
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
 *
 * `resumeThumbnailPath` is optional because the two callers that write
 * arrive in order: the synchronous write that guarantees the position
 * lands, then the async one that adds the captured frame.
 */
function writeCheckpoint(snapshot: Snapshot, resumeThumbnailPath?: string): boolean {
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
    ...(resumeThumbnailPath ? {resumeThumbnailPath} : {}),
    ...(session.type ? {type: session.type} : {}),
    ...(session.mediaLane ? {mediaType: session.mediaLane} : {}),
    ...(session.provider ? {provider: session.provider} : {}),
  });
  return true;
}

/**
 * Grab a still at the session's final position.
 *
 * Returns `undefined` for every failure. That is not a silent catch for
 * its own sake — `captureFrame` is specified to RESOLVE `null` for
 * "there is no frame here" (a live stream, an unsupported container, an
 * unreachable URL), which is an ordinary outcome, not an error. A
 * continue-watching card without a frame still resumes; it just shows
 * the poster instead. The rejection path is for programmer error and
 * belongs in the console, not in a swallowed expression.
 *
 * Only ever called on the teardown flush. Capturing on the 30 s cadence
 * as well would open a decoder and re-fetch a byte range every thirty
 * seconds to produce a picture that looks identical to the one from the
 * previous tick — real cost for no visible difference.
 */
async function captureResumeThumbnail(snapshot: Snapshot): Promise<string | undefined> {
  const session = snapshot.session;
  if (!session || !(snapshot.positionMs > 0)) return undefined;

  try {
    const path = await captureFrame(session.uri, snapshot.positionMs, {
      width: RESUME_THUMB_WIDTH,
      height: RESUME_THUMB_HEIGHT,
    });
    return path ?? undefined;
  } catch (error) {
    logger.warn('[checkpoint] resume thumbnail capture failed', error);
    return undefined;
  }
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

  const lastWriteRef = useRef<{uri: string; sessionId: number; at: number} | null>(
    null,
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = snapshotRef.current;
      const session = snapshot.session;
      if (!session) return;

      const at = now();
      const last = lastWriteRef.current;
      // Keyed on the SESSION, not on the URI. The previous version
      // compared `last.uri === session.uri` with a comment claiming
      // that this lets "relaunching the same film right after closing
      // it" start a fresh countdown — it does the opposite. Replaying
      // the film you just closed is precisely the case where the URIs
      // MATCH, so the new session inherited the old timestamp and sat
      // out its first 30 s of checkpoints. The test named for this
      // behaviour passed without ever checking it, because the tick it
      // meant to assert on was silently rate-limited out and the count
      // it did check came from the teardown flush instead.
      //
      // A session id is monotonic per launch, so a new session always
      // writes its first checkpoint on time — and the previous
      // session's final position has already been flushed by its own
      // teardown, so nothing is lost by writing early.
      if (
        last &&
        last.uri === session.uri &&
        last.sessionId === session.sessionId &&
        at - last.at < CHECKPOINT_INTERVAL_MS
      ) {
        return;
      }

      if (writeCheckpoint(snapshot)) {
        lastWriteRef.current = {uri: session.uri, sessionId: session.sessionId, at};
      }
    }, CHECKPOINT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [now]);

  // Flush on teardown so "watched to 29:59, pressed back" does not
  // resume at 29:30. Cleanup-only, so this runs exactly once per
  // session — on switch, on close, or on the activity going away — and
  // never duplicates the periodic path's last write.
  //
  // W9.5: the teardown is also the only place a resume frame is
  // captured, because it is the only moment whose position is the one
  // the user actually left at. It is captured AFTER the synchronous
  // write and written as a second, idempotent update rather than
  // awaited in front of it: a capture that is slow, or that never
  // resolves because the activity is going away, must not be able to
  // cost the user their resume position.
  const sessionId = nowPlaying?.sessionId ?? null;

  useEffect(() => {
    return () => {
      const snapshot = snapshotRef.current;
      if (!writeCheckpoint(snapshot)) return;
      void captureResumeThumbnail(snapshot).then(path => {
        if (path) writeCheckpoint(snapshot, path);
      });
    };
  }, [sessionId]);
}
