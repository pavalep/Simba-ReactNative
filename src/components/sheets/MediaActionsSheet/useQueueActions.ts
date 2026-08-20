import {useCallback} from 'react';
import {useAppDispatch} from '../../../store';
import {prependToQueue, addToQueue as addToQueueAction} from '../../../store/slices/playerSlice';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {normalizeMediaClassification} from '../../../types/media';

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
 * row/tile long-press menu — one toast + dispatch convention everywhere.
 */
export function useQueueActions() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const toEntry = useCallback((item: QueueableItem): PlaylistEntry => {
    return {
      uri: item.uri,
      title: item.title,
      duration: item.duration ?? 0,
      ...normalizeMediaClassification({
        source: item.source,
        type: item.type,
        mediaType: item.mediaType,
        provider: item.provider,
      }),
      folderId: item.folderId,
    };
  }, []);

  const playNext = useCallback(
    (item: QueueableItem) => {
      dispatch(prependToQueue(toEntry(item)));
      toast.show('Playing next');
    },
    [dispatch, toEntry, toast],
  );

  const addToQueue = useCallback(
    (item: QueueableItem) => {
      dispatch(addToQueueAction(toEntry(item)));
      toast.show('Added to queue');
    },
    [dispatch, toEntry, toast],
  );

  return {playNext, addToQueue};
}
