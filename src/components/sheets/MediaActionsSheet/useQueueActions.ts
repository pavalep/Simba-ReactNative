import {useCallback} from 'react';
import {useQueue, type PlayerQueueItem} from '@simba-dev/react-native-media-player';
import {mediaKindToLane, type MediaKind, type MediaLane, type MediaSource} from '../../../types/media';

import {useToast} from '../../feedback/Toast/Toast';

export interface QueueableItem {
  uri: string;
  title: string;
  duration?: number;
  source?: MediaSource;
  type?: MediaKind;
  mediaType?: MediaLane;
  provider?: string;
  folderId?: string;
}

/**
 * 58.5: the standard "Play Next / Add to Queue" builders shared by every
 * row/tile long-press menu — one toast + queue-store call everywhere.
 * V15 Phase 65: queue lives in the module's zustand store (`useQueue`).
 * V16 Phase 70: the `toEntry` builder now derives `type` (MediaKind) and
 * `mediaType` (MediaLane) from one of the caller-provided fields with
 * consistent defaults. Previously both fields were fed the same `lane`
 * value, which violated the type contract (a `MediaLane` was being
 * stored in a `MediaKind` field).
 */
export function useQueueActions() {
  const {addToQueue: addToQueueStore, prependToQueue: prependToQueueStore} = useQueue();
  const toast = useToast();

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

  const playNext = useCallback(
    (item: QueueableItem) => {
      prependToQueueStore(toEntry(item));
      toast.show('Playing next');
    },
    [prependToQueueStore, toEntry, toast],
  );

  const addToQueue = useCallback(
    (item: QueueableItem) => {
      addToQueueStore(toEntry(item));
      toast.show('Added to queue');
    },
    [addToQueueStore, toEntry, toast],
  );

  return {playNext, addToQueue};
}
