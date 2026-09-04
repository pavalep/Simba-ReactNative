import {useCallback} from 'react';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {useQueue, type PlayerQueueItem} from '@simba-dev/react-native-media-player';

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
 */
export function useQueueActions() {
  const {addToQueue: addToQueueStore, prependToQueue: prependToQueueStore} = useQueue();
  const toast = useToast();

  const toEntry = useCallback((item: QueueableItem): PlayerQueueItem => {
    const lane = item.mediaType;
    return {
      uri: item.uri,
      title: item.title,
      duration: item.duration ?? 0,
      source: item.source,
      type: lane,
      mediaType: lane,
      provider: item.provider,
      folderId: item.folderId,
    };
  }, []);

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
