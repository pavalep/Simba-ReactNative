/**
 * V21 F5 A1 — playlist launches go through the app seam.
 *
 * ## The live routing
 *
 * ```
 * app useOpenPlaylist  ->  app useResumeAwareLaunch().openPlayer
 * ```
 *
 * The app never calls the lib's `usePlayerActivity` itself: the seam owns
 * the session, the lane and the resume policy before anything is handed
 * on, and a video load happens in-window — no `startActivity`, no second
 * Activity anywhere in this path.
 *
 * ## What it deliberately does NOT do
 *
 * It does not manage the queue. The call sites already call
 * `usePlayerStore.getState().loadPlaylistToPlayer(...)` before launching, and
 * that ordering is the app's, not the lib's. Folding queue ownership in here
 * would be a second owner for one fact.
 *
 * Ordering is unchanged — shuffle and start-index resolve exactly as the lib
 * hook resolved them, including the "shuffle never starts at index 0" rule.
 * Changing behaviour that already works is not this step's job.
 */

import {useCallback, useMemo} from 'react';
import type {MediaKind, MediaLane} from '../../types/media';
import {useResumeAwareLaunch} from './useResumeAwareLaunch';

/**
 * The minimum an entry must carry to be launched.
 *
 * `type` and `mediaType` are named to match `PlaylistEntry` in
 * `src/state/playerStore.ts`, so every call site can pass its entries
 * directly. They are optional here because a caller with only a URI is
 * legitimate — the launch still works, it just carries less metadata.
 */
export interface PlaylistLaunchEntry {
  uri: string;
  title: string;
  /** Semantic catalogue kind (`'movie'`, `'podcast'`, …) → the seam's `mediaKind`. */
  type?: MediaKind;
  /** Playback lane → the seam's `mediaLane`. */
  mediaType?: MediaLane;
  provider?: string;
  thumbnailPath?: string;
}

export interface PlaylistLaunchOptions {
  /** Stream type. Defaults to `'audio'`, matching the lib hook it replaces. */
  type?: 'video' | 'audio';
  /** Index into `entries` to start from. Defaults to 0. */
  startIndex?: number;
  /** Start position for the first track, in milliseconds. */
  startPositionMs?: number;
  /** Shuffle a COPY of the list. The input array is never mutated. */
  shuffle?: boolean;
  /**
   * Identity for the START track, overriding what the entry itself carries.
   *
   * Replaces the lib's `Record<string, unknown>` with this file's own entry
   * shape, deliberately. The lib's version forwarded arbitrary keys straight
   * onto the bridge, which meant `PlaylistDetailScreen` could pass
   * `artworkUri` — a name nothing downstream reads — and the artwork was
   * dropped with no error. Typing the override as the fields the seam
   * actually consumes makes that a compile error instead of a silent loss.
   *
   * `folderId` is intentionally absent: it is read from the queue item
   * (`loadPlaylistToPlayer`), never from launch options, so passing it here
   * did nothing.
   */
  startExtras?: Partial<Omit<PlaylistLaunchEntry, 'uri' | 'title'>>;
}

export interface UseOpenPlaylistResult {
  openPlaylist: (
    entries: PlaylistLaunchEntry[],
    opts?: PlaylistLaunchOptions,
  ) => Promise<boolean>;
}

/**
 * Resolve which entry a launch starts on, and in what order.
 *
 * Pure and exported so the ordering rules can be tested without a hook. The
 * shuffle rule is inherited from the lib hook verbatim: when shuffling
 * without an explicit index, pick a random non-zero index, so a shuffled
 * album does not silently begin on track 1 — which is what the user would
 * get from `shuffle: false` and therefore not what "shuffle" means to them.
 */
export function orderPlaylist(
  entries: PlaylistLaunchEntry[],
  opts: PlaylistLaunchOptions = {},
): {ordered: PlaylistLaunchEntry[]; startIndex: number} {
  let ordered = entries;

  if (opts.shuffle) {
    ordered = [...entries];
    for (let i = ordered.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = ordered[i]!;
      const b = ordered[j]!;
      ordered[i] = b;
      ordered[j] = a;
    }
  }

  let startIndex = opts.startIndex ?? 0;

  if (opts.shuffle && opts.startIndex == null) {
    startIndex = entries.length > 1 ? Math.floor(Math.random() * (entries.length - 1)) + 1 : 0;
  }

  if (startIndex >= ordered.length) {
    startIndex = ordered.length - 1;
  }
  if (startIndex < 0) {
    startIndex = 0;
  }

  return {ordered, startIndex};
}

/**
 * Launch a playlist through the app seam.
 *
 * Replaces the lib's `useOpenPlaylist` in the app's barrel. Same name, same
 * call shape — the existing call sites need no edit, and the name stays
 * accurate because the verb did not change. What changed is that the start
 * track now goes through the same seam every other launch uses.
 */
export function useOpenPlaylist(): UseOpenPlaylistResult {
  const {openPlayer} = useResumeAwareLaunch();

  const openPlaylist = useCallback(
    async (
      entries: PlaylistLaunchEntry[],
      opts: PlaylistLaunchOptions = {},
    ): Promise<boolean> => {
      // Empty list is a no-op, as before — not an error the caller should
      // have to distinguish.
      if (!entries || entries.length === 0) return false;

      const {ordered, startIndex} = orderPlaylist(entries, opts);
      const start = ordered[startIndex];
      if (start == null) return false;

      // `startExtras` wins over the entry's own identity, matching the lib
      // hook's precedence — and it wins on a field-by-field basis, so an
      // override that sets only artwork does not erase the entry's lane.
      const identity = {...start, ...opts.startExtras};

      return openPlayer({
        uri: start.uri,
        title: start.title,
        type: opts.type ?? 'audio',
        ...(opts.startPositionMs != null
          ? {startPositionMs: opts.startPositionMs}
          : {}),
        // The two fields the lib hook had no concept of. Forwarding them is
        // the whole point of this hook: without them the session records no
        // lane, and an absent lane is exactly how a film ends up badge-marked
        // as music.
        ...(identity.type != null ? {mediaKind: identity.type} : {}),
        ...(identity.mediaType != null ? {mediaLane: identity.mediaType} : {}),
        ...(identity.provider != null ? {provider: identity.provider} : {}),
        ...(identity.thumbnailPath != null
          ? {thumbnailPath: identity.thumbnailPath}
          : {}),
      });
    },
    [openPlayer],
  );

  return useMemo<UseOpenPlaylistResult>(
    () => ({openPlaylist}),
    [openPlaylist],
  );
}