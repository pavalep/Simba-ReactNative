import * as React from 'react';
import {
  useBookmarks,
  isSameBookmarkPosition,
  MAX_BOOKMARK_ENTRIES,
  type Bookmark,
  type BookmarkInput,
} from '../../features/bookmarks';
import {useBookmarksStore} from '../../state';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {useTransport} from './useTransport';

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
 * bar (see `useBookmarkMarkers`), which is exactly how Jellyfin Enhanced
 * and MyVideoSpot resolve the same tension.
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
      // Required too. Defaults to `video` because this control only
      // ships on the video player today; the audio lanes are wired in
      // the same place when the music player lands, and they pass their
      // own lane through `session.mediaLane`.
      mediaType: session?.mediaLane ?? 'video',
      // Required as well. A deep link or the file picker launches
      // without a semantic kind, and defaulting to `video` is the
      // honest floor for a control that only renders on the video
      // player — the audio lanes pass their own kind when they arrive.
      type: session?.type ?? 'video',
      ...(session?.thumbnailPath ? {thumbnailPath: session.thumbnailPath} : {}),
      ...(session?.provider ? {provider: session.provider} : {}),
    }),
    [uri, session, state.title, state.durationMs, positionSec],
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

/**
 * Bookmark positions for the current file, normalised to 0…1.
 *
 * Feeds the timeline markers. Returns an empty array when there is
 * nothing to draw, which lets the transport bar skip the layer entirely
 * rather than mounting an empty view over the scrub track.
 */
export function useBookmarkMarkers(): number[] {
  const session = useNowPlayingStore(s => s.current);
  const items = useBookmarksStore(s => s.items);
  const {state} = useTransport();

  const duration = state.durationMs;
  return React.useMemo(() => {
    if (!session || !(duration > 0)) return [];
    return items
      .filter(b => b.fileUri === session.uri)
      .map(b => b.position / duration)
      .filter(f => f > 0 && f <= 1);
  }, [items, session, duration]);
}

export {MAX_BOOKMARK_ENTRIES};