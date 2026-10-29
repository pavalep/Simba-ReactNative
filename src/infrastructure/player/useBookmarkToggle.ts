import * as React from 'react';
import {
  useBookmarks,
  isSameBookmarkPosition,
  MAX_BOOKMARK_ENTRIES,
  type Bookmark,
  type BookmarkInput,
} from '../../features/bookmarks';
import {useBookmarksStore, useRecentHistoryStore} from '../../state';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {useTransport} from './useTransport';
import {mediaKey} from './playbackProgress';

/**
 * W9.4 — the bookmark toggle for the player.
 *
 * ## Why the toggle is POSITION-scoped, not file-scoped
 *
 * There are two shipping models and they are not interchangeable:
 *
 *   - **File-scoped "Save"** — Netflix, YouTube. Saving the *title*.
 *     One row per film, position ignored. Netflix adds it to My List;
 *     YouTube's is "Save to Watch later".
 *   - **Position-scoped bookmark** — Jellyfin Enhanced, MyVideoSpot.
 *     Saving *a moment*. Several per film; the control adds a marker at
 *     the playhead, and removes it when a marker is already at the
 *     playhead.
 *
 * SIMBA's data model is already position-scoped: `buildBookmarkId`
 * encodes `(fileUri, position)` and the store deliberately permits
 * multiple bookmarks per file. Picking the file-scoped model would have
 * meant either discarding that model or shipping a second, contradictory
 * notion of "bookmarked" between the player and the Bookmarks screen.
 *
 * The visible cost is real and is mitigated, not hidden: a bookmark at
 * 5:00 does not light the toggle when playback is at 5:03. That is the
 * honest answer — there is no bookmark *here*. What tells the user the
 * file has bookmarks at all is the timeline markers on the transport
 * bar, which is exactly how Jellyfin Enhanced and MyVideoSpot resolve
 * the same tension.
 *
 * ## The identity problem, and why the session is the source
 *
 * There is no "current uri" in player state. `useTransport().state
 * .currentUri` comes from the lib's queue, and this app launches a
 * single file, so it is null. `useNowPlayingStore` is what the launch
 * seam published, and it is the only place that knows. Before this,
 * a bookmark could not be attached to the file actually playing.
 */

export interface BookmarkToggle {
  /** A bookmark exists at the current position. Drives the toggle. */
  readonly isBookmarkedHere: boolean;
  /** This file has at least one bookmark, anywhere. Drives the a11y hint. */
  readonly hasAnyBookmark: boolean;
  /** Total bookmarks for this file. */
  readonly count: number;
  /** The bookmark at the current position, if any. */
  readonly current: Bookmark | null;
  /** All bookmarks for this file, ascending by position. */
  readonly all: Bookmark[];
  /** Add at the playhead, or remove what is at it. */
  readonly onToggle: () => void;
  /** Playhead position in seconds — for the confirmation message. */
  readonly positionSec: number;
  /**
   * The list is full and this is a new bookmark. `onToggle` deliberately
   * wrote nothing and parked the request; the caller shows
   * {@link BookmarkOverflowDialog}, then calls `confirmEviction` with
   * the bookmark the user chose to give up.
   */
  readonly needsEviction: boolean;
  /**
   * Run the parked request, replacing the bookmark the user chose.
   *
   * Takes the victim explicitly. It used to evict the oldest
   * un-asked-for, which is a policy the user never agreed to — the
   * oldest bookmark is not necessarily the one they care least about,
   * and they are standing right there.
   */
  readonly confirmEviction: (evictId: string) => void;
  /** Abandon the parked request. */
  readonly cancelEviction: () => void;
  /** True when there is no session to bookmark. */
  readonly unavailable: boolean;
}

export function useBookmarkToggle(): BookmarkToggle {
  const {state} = useTransport();
  const session = useNowPlayingStore(s => s.current);

  const uri = session?.uri;
  const items = useBookmarksStore(s => s.items);
  const add = useBookmarks(uri);
  const remove = add.remove;

  // The captured frame for THIS media — the picture of where the user
  // was, which the catalogue's poster cannot say.
  //
  // ## Where the capture actually lives
  //
  // `usePlaybackCheckpointSync` grabs a still at the session's final
  // position and writes it to the HISTORY store
  // (`writeCheckpoint(snapshot, path, false)`). That store is the only
  // place it goes.
  //
  // The playback SESSION cannot be the carrier: the frame is captured
  // at the session's END — after the session is gone — and the session
  // carries only the catalogue artwork (`thumbnailPath`). So the
  // hand-off has to come from the history store, and this is the
  // reader that closes it.
  //
  // The result is that a bookmark shows the same picture the Recently
  // Played rail and the resume prompt show for the same file, instead
  // of a placeholder glyph whenever the catalogue had no art.
  const resumeThumbnailPath = useRecentHistoryStore(s =>
    uri
      ? s.entries.find(entry => mediaKey(entry.fileUri) === mediaKey(uri))
          ?.resumeThumbnailPath
      : undefined,
  );

  // Read once per render; `positionMs` advances 4x/second, and this
  // hook feeds a control that must not re-render the whole topbar at
  // that rate any more than the transport bar already does.
  const positionSec = state.positionMs / 1000;

  const all = React.useMemo(
    () => (uri ? items.filter(b => b.fileUri === uri) : []),
    [items, uri],
  );

  const current = React.useMemo(
    () => all.find(b => isSameBookmarkPosition(b.position, positionSec)) ?? null,
    [all, positionSec],
  );

  const buildInput = React.useCallback(
    (): BookmarkInput => ({
      fileUri: uri as string,
      title: session?.title ?? state.title,
      position: positionSec,
      duration: state.durationMs / 1000,
      // Required by `BookmarkInput`. Defaults chosen here, not by the
      // store, so the record is complete the moment it is written —
      // the store's own fallbacks would leave a persisted row that
      // claims `source: 'api'` for a file that is plainly on disk.
      source: session?.provider ? 'api' : 'local',
      label: '',
      // The lane and the kind are now ALWAYS written by the launch seam
      // from `bridgeOpts.type`, so these are reads of real data rather
      // than guesses. `streamType` is kept as the intermediate fallback
      // because it is the same fact at a coarser resolution — preferring
      // it beats inventing a lane.
      //
      // The trailing `'video'` is a type backstop for a session that
      // carries neither field at all, which the seam no longer permits.
      // It is deliberately the LAST resort and not the first: an earlier
      // revision reached for 'video' first, which tagged every audio
      // launch that arrived without a lane as video.
      mediaType: session?.mediaLane ?? session?.streamType ?? 'video',
      type: session?.type ?? session?.streamType ?? 'video',
      ...(session?.thumbnailPath ? {thumbnailPath: session.thumbnailPath} : {}),
      // The frame the app captured for this media. A bookmark is a
      // position, so it carries the picture of that position — the same
      // rule the Recently Played rail and the resume prompt follow.
      ...(resumeThumbnailPath ? {resumeThumbnailPath} : {}),
      ...(session?.provider ? {provider: session.provider} : {}),
    }),
    [uri, session, state.title, state.durationMs, positionSec, resumeThumbnailPath],
  );

  // STATE, not a ref: parking a request has to re-render the control,
  // otherwise the confirm affordance appears a frame late or not at all.
  // (A ref would leave `needsEviction` permanently stale in the render
  // that produced it.)
  const [pending, setPending] = React.useState<
    ReturnType<typeof buildInput> | null
  >(null);

  // Capacity is checked BEFORE the write, not after. `addBookmark`
  // returns `requires-confirmation` only once it has already refused,
  // which would mean the control had to render twice for one tap and the
  // user could double-add in between.
  //
  // The cap is GLOBAL, not per file. `MAX_BOOKMARK_ENTRIES` bounds the
  // whole list, so twenty bookmarks across ten different films fill it
  // just as twenty bookmarks of one film do. Checking `all.length`
  // (this file's bookmarks) instead would let the store silently evict
  // the user's oldest bookmark the moment a 21st was added anywhere.
  const atCapacity = items.length >= MAX_BOOKMARK_ENTRIES;

  const confirmEviction = React.useCallback(
    (evictId: string) => {
      const input = pending;
      if (!input) return;
      setPending(null);
      remove(evictId);
      add.add(input, {evictId});
    },
    [pending, remove, add],
  );

  const cancelEviction = React.useCallback(() => setPending(null), []);

  const onToggle = React.useCallback(() => {
    // No session ⇒ nothing to act on. Per SPEC I11 a control that
    // cannot act must render nothing rather than sit there inert, so
    // the caller hides itself; this guard is the belt to that braces.
    if (!uri) return;

    if (current) {
      remove(current.id);
      return;
    }

    const input = buildInput();
    if (atCapacity) {
      // Park it. A full list must not silently drop the user's oldest
      // bookmark to make room for a new one.
      setPending(input);
      return;
    }
    add.add(input);
  }, [uri, current, remove, buildInput, atCapacity, add]);

  return {
    isBookmarkedHere: current !== null,
    hasAnyBookmark: all.length > 0,
    count: all.length,
    current,
    all: React.useMemo(
      () => [...all].sort((a, b) => a.position - b.position),
      [all],
    ),
    onToggle,
    positionSec,
    needsEviction: pending !== null,
    confirmEviction,
    cancelEviction,
    unavailable: !uri,
  };
}

export {MAX_BOOKMARK_ENTRIES};