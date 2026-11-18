import {useCallback, useRef} from 'react';
import {useQueue, type PlayerQueueItem} from '../infrastructure/player';
import {
  mediaKindToLane,
  type MediaKind,
  type MediaLane,
  type MediaSource,
  type QueueableItem,
} from '../types/media';

import {useToast} from '../components/feedback/Toast';

/**
 * The shape a queue action takes.
 *
 * Re-exported from `src/types/media.ts`, where the classification fields it
 * carries live, so there is ONE owner of the shape and one owner of the
 * action.
 */
export type {QueueableItem} from '../types/media';

/**
 * 58.5: the standard "Play Next / Add to Queue" builders shared by every
 * row/tile long-press menu — one toast + queue-store call everywhere.
 * V15 Phase 65: queue lives in the module's zustand store (`useQueue`).
 * V16 Phase 70: the `toEntry` builder now derives `type` (MediaKind) and
 * `mediaType` (MediaLane) from one of the caller-provided fields with
 * consistent defaults. Previously both fields were fed the same `lane`
 * value, which violated the type contract (a `MediaLane` was being
 * stored in a `MediaKind` field).
 *
 * WAVE B16: it moved here from
 * `components/sheets/MediaActionsSheet/useQueueActions.ts`. Its old home
 * was ONE SHEET's folder, and this hook is called by the Music screen, the
 * Album track list, the Library rows, the History screen, the shared
 * streaming row and BOTH lanes' more sheets — a cross-cutting action with
 * a cross-cutting home.
 *
 * ## WAVE B16 — the toast offers UNDO
 *
 * "Added to queue" is a thing you can regret. Spotify, Apple Music and
 * YouTube Music all offer an **Undo** on that exact toast, and the app's
 * own `Toast` was BUILT for it — its action slot's own docblock names
 * "Undo" as the example — but nothing ever used one for a queue action.
 *
 * The undo removes the item the user just added, matched by URI:
 *
 *   - "Add to Queue" APPENDS, so the undo removes the LAST match;
 *   - "Play Next" PREPENDS, so the undo removes the FIRST match.
 *
 * Matching by URI rather than by a remembered index is what makes it
 * correct when the queue changed in between: an index would remove
 * whatever moved into that slot.
 */
export function useQueueActions() {
  // ONE subscription, shallow-compared by the lib's `useQueue(selector)`:
  // the queue array and three stable action functions. The actions never
  // change identity, so this re-renders only when the QUEUE does.
  const {
    queue,
    addToQueue: addToQueueStore,
    prependToQueue: prependToQueueStore,
    removeFromQueueByIndex,
  } = useQueue(s => ({
    queue: s.queue,
    addToQueue: s.addToQueue,
    prependToQueue: s.prependToQueue,
    removeFromQueueByIndex: s.removeFromQueueByIndex,
  }));
  const toast = useToast();

  // The queue as this hook last saw it. The undo reads it when the user
  // taps the action, so it acts on the queue as it is THEN — not as it
  // was when the toast was raised.
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const toEntry = useCallback(
    (item: QueueableItem): PlayerQueueItem<MediaSource, MediaKind, MediaLane> => {
      const mediaType: MediaLane = item.mediaType ?? (item.type ? mediaKindToLane(item.type) : 'audio');
      const type: MediaKind = item.type ?? (mediaType === 'video' ? 'video' : 'audio');
      const source: MediaSource = item.source ?? 'local';
      return {
        uri: item.uri,
        title: item.title,
        duration: item.duration ?? 0,
        source,
        type,
        mediaType,
        ...(item.provider ? {provider: item.provider} : {}),
        ...(item.folderId ? {folderId: item.folderId} : {}),
      };
    },
    [],
  );

  /**
   * Remove the item a queue action just added.
   *
   * `fromEnd` says which end it went on: an append is undone from the
   * tail, a prepend from the head.
   */
  const undoQueueAdd = useCallback(
    (uri: string, fromEnd: boolean) => {
      const current = queueRef.current;
      const index = fromEnd
        ? current.map(q => q.uri).lastIndexOf(uri)
        : current.map(q => q.uri).indexOf(uri);
      if (index >= 0) {
        removeFromQueueByIndex(index);
      }
    },
    [removeFromQueueByIndex],
  );

  const playNext = useCallback(
    (item: QueueableItem) => {
      prependToQueueStore(toEntry(item));
      toast.show('Playing next', 'info', {
        action: {
          label: 'Undo',
          onPress: () => undoQueueAdd(item.uri, false),
        },
      });
    },
    [prependToQueueStore, toEntry, toast, undoQueueAdd],
  );

  const addToQueue = useCallback(
    (item: QueueableItem) => {
      addToQueueStore(toEntry(item));
      toast.show('Added to queue', 'info', {
        action: {
          label: 'Undo',
          onPress: () => undoQueueAdd(item.uri, true),
        },
      });
    },
    [addToQueueStore, toEntry, toast, undoQueueAdd],
  );

  return {playNext, addToQueue};
}
