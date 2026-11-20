/**
 * B15-Q3 — the explicit queue must survive a restart.
 *
 * ## The defect
 *
 * The explicit queue — the list every "Play Next" and "Add to Queue" in the
 * app writes to — lives in the library's `usePlayerQueueStore`, which is an
 * in-memory zustand store. A restart empties it. A queue the user spent ten
 * minutes building ("play these next, in this order") was simply gone, with
 * nothing said.
 *
 * ## Why the durable copy lives HERE, and not in the library
 *
 * The library's queue store is deliberately storage-agnostic: the package
 * depends on `zustand` and nothing else, so it has no notion of MMKV,
 * AsyncStorage or any other device store. Adding persistence there would mean
 * the LIBRARY choosing the app's storage — the wrong way round for a package
 * other apps install.
 *
 * So the app keeps the DURABLE copy and the library keeps the LIVE one. That
 * is a mirror, not a second owner:
 *
 *   - the live queue is written by exactly one place — the library's store,
 *     through the app's `useQueueActions` wrapper;
 *   - the mirror is written ONLY from the live queue, and read ONLY once —
 *     at boot, when the live queue is empty;
 *   - nothing reads the mirror while the live queue is alive.
 *
 * ## What is persisted
 *
 * The fields a queue row actually carries: the identity (`uri`), the label
 * (`title`), the duration, the presentation fields the library's notification
 * uses (`artist`, `album`, `artworkUri`), and the classification (`source`,
 * `type`, `mediaType`, `provider`, `folderId`, `autoplay`).
 *
 * `resumePosition` is deliberately NOT persisted. The launch seam owns
 * resume and resolves it per launch from the bookmarks and the history; a
 * position frozen onto a queued row would be a second resume rule, and two
 * resume rules are how a resume silently starts at 0:00.
 *
 * ## The cap
 *
 * The live queue is uncapped, so the mirror is too — up to
 * `MAX_PERSISTED_QUEUE_ITEMS`. Past that the mirror keeps the HEAD of the
 * queue (the tracks that play next) and drops the tail, because a queue
 * that grows without bound is a queue that fills the disk.
 */

import {useEffect, useRef} from 'react';
import {useQueue, useQueueItemsAs} from '@simba-dev/react-native-media-player';
import type {PlayerQueueItem} from '@simba-dev/react-native-media-player';
import {kvGet, kvSet} from '../persistence/mmkv';
import {mediaKindToLane} from '../../types/media';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';

/** The MMKV key the mirror lives under. */
 const PERSISTED_QUEUE_KEY = 'playerQueueMirror';

/**
 * How many entries the mirror keeps.
 *
 * The live queue is uncapped, so this is a bound on the DURABLE copy only.
 * The head is kept — those are the tracks that play next — and the tail is
 * dropped.
 */
export const MAX_PERSISTED_QUEUE_ITEMS = 200;

/** The app's media classification, as it can appear on disk. */
const MEDIA_SOURCES: readonly MediaSource[] = ['local', 'api'];
const MEDIA_KINDS: readonly MediaKind[] = [
  'audio',
  'music',
  'podcast',
  'audiobook',
  'radio',
  'video',
  'movie',
  'live-tv',
  'archive-audio',
  'archive-video',
];
const MEDIA_LANES: readonly MediaLane[] = ['audio', 'video'];

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Read the mirror.
 *
 * Every row is validated: a row without a `uri` has no identity and is
 * dropped, a row with an unknown classification has that field dropped
 * rather than carried, and a row whose kind is known but whose lane is not
 * gets the lane DERIVED from the kind — the same rule the rest of the app
 * uses (`mediaKindToLane`), so a persisted row cannot disagree with itself.
 */
export function readPersistedQueue(): PlayerQueueItem<
  MediaSource,
  MediaKind,
  MediaLane
>[] {
  const raw = kvGet<unknown>(PERSISTED_QUEUE_KEY);
  if (!Array.isArray(raw)) return [];

  const rows: PlayerQueueItem<MediaSource, MediaKind, MediaLane>[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const uri = typeof record.uri === 'string' ? record.uri : '';
    if (uri.length === 0) continue;

    const kind = oneOf(record.type, MEDIA_KINDS);
    // The lane is DERIVED from the kind whenever the kind is known —
    // the same rule the rest of the app uses, so a persisted row that
    // disagrees with itself heals instead of disagreeing forever.
    // With no kind there is nothing to derive from, so the lane that
    // was stored is kept (if it is a lane at all).
    const lane = kind
      ? mediaKindToLane(kind)
      : oneOf(record.mediaType, MEDIA_LANES);

    rows.push({
      uri,
      title: typeof record.title === 'string' ? record.title : 'Untitled',
      duration:
        typeof record.duration === 'number' && Number.isFinite(record.duration)
          ? record.duration
          : 0,
      ...(typeof record.artist === 'string' ? {artist: record.artist} : {}),
      ...(typeof record.album === 'string' ? {album: record.album} : {}),
      ...(typeof record.artworkUri === 'string'
        ? {artworkUri: record.artworkUri}
        : {}),
      ...(oneOf(record.source, MEDIA_SOURCES)
        ? {source: oneOf(record.source, MEDIA_SOURCES)!}
        : {}),
      ...(kind ? {type: kind} : {}),
      ...(lane ? {mediaType: lane} : {}),
      ...(typeof record.provider === 'string'
        ? {provider: record.provider}
        : {}),
      ...(typeof record.folderId === 'string' ? {folderId: record.folderId} : {}),
      ...(typeof record.autoplay === 'boolean'
        ? {autoplay: record.autoplay}
        : {}),
    });
  }
  return rows;
}

/**
 * Write the mirror.
 *
 * Only the head of the queue is kept (see `MAX_PERSISTED_QUEUE_ITEMS`), and
 * `resumePosition` is dropped for the reason in this module's docblock.
 */
export function writePersistedQueue(
  items: readonly PlayerQueueItem<MediaSource, MediaKind, MediaLane>[],
): void {
  const rows = items.slice(0, MAX_PERSISTED_QUEUE_ITEMS).map(item => {
    const row: Record<string, unknown> = {
      uri: item.uri,
      title: item.title,
      duration: item.duration,
    };
    if (item.artist != null) row.artist = item.artist;
    if (item.album != null) row.album = item.album;
    if (item.artworkUri != null) row.artworkUri = item.artworkUri;
    if (item.source != null) row.source = item.source;
    if (item.type != null) row.type = item.type;
    if (item.mediaType != null) row.mediaType = item.mediaType;
    if (item.provider != null) row.provider = item.provider;
    if (item.folderId != null) row.folderId = item.folderId;
    if (item.autoplay != null) row.autoplay = item.autoplay;
    return row;
  });
  kvSet(PERSISTED_QUEUE_KEY, rows);
}

/**
 * Mount ONCE — beside `useQueueSync` in `AppContent`.
 *
 * Returns nothing; side-effect only.
 */
export function useQueuePersistence(): void {
  const queue = useQueueItemsAs<PlayerQueueItem<MediaSource, MediaKind, MediaLane>>();
  const {addToQueue} = useQueue();

  // ── Hydrate, ONCE ────────────────────────────────────────────────
  //
  // A live queue wins over the mirror. If the queue is already
  // populated when this runs, something added to it before the mirror
  // could hydrate, and the live intent is the newer truth.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (queue.length > 0) return;
    const persisted = readPersistedQueue();
    if (persisted.length === 0) return;
    for (const item of persisted) {
      addToQueue(item);
    }
  }, [addToQueue, queue]);

  // ── Mirror every change ─────────────────────────────────────────
  //
  // The FIRST run is skipped on purpose. The hydrate effect above runs
  // first, in the same commit, and it may have just filled the queue —
  // but this effect still sees the queue as it was BEFORE that fill, so
  // writing it would erase the mirror that was just read.
  const firstRunSkippedRef = useRef(false);
  useEffect(() => {
    if (!firstRunSkippedRef.current) {
      firstRunSkippedRef.current = true;
      return;
    }
    writePersistedQueue(queue);
  }, [queue]);
}