import React from 'react';
import {MAX_RECENT_HISTORY_ENTRIES} from '../../../state/recentHistoryStore';
import {formatDuration} from '../../../utils/timeAgo';
import {MediaRail} from '../../../components/media/MediaRail';
import {MediaRailCard} from '../../../components/media/MediaRailCard';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';

export interface HomeMediaShelfItem {
  fileUri: string;
  title: string;
  mediaType?: MediaLane;
  type?: MediaKind;
  source?: MediaSource;
  provider?: string;
  folderId?: string;
  /** Poster artwork from the catalogue. */
  thumbnailPath?: string;
  /**
   * A frame captured at the saved resume position.
   *
   * Preferred over artwork wherever one exists: on a continue-watching
   * rail the artwork tells you which film, and the frame tells you
   * *where in it you were*, which is the reason the row exists.
   */
  resumeThumbnailPath?: string;
  position?: number;
  duration?: number;
  /** Identity for removal, when the shelf supports it. */
  id?: string;
}

interface HomeMediaShelfProps {
  title: string;
  items: HomeMediaShelfItem[];
  onItemPress: (item: HomeMediaShelfItem) => void;
  /**
   * Long-press action, wired to the card's long-press. Supplied by the
   * Recently Played shelf so a card can be removed from the rail
   * without opening the History screen.
   */
  onItemLongPress?: (item: HomeMediaShelfItem) => void;
  onSeeAll?: () => void;
  /**
   * Defaults to the store's own cap so the rail can never show fewer
   * cards than the data layer decided to keep. The previous default was
   * a hard-coded 8 against a 10-entry store, so "max 10" rendered 8.
   */
  maxItems?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: 'video' | 'music' | 'headphones' | 'bookmark' | 'list' | 'search' | 'play' | 'folder';
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export const HomeMediaShelf: React.FC<HomeMediaShelfProps> = ({
  title,
  items,
  onItemPress,
  onItemLongPress,
  onSeeAll,
  maxItems = MAX_RECENT_HISTORY_ENTRIES,
  emptyTitle = 'Nothing Played Yet',
  emptyDescription = 'Files you open will appear here — start playing something to see it show up.',
  emptyIcon = 'video',
  emptyActionLabel,
  onEmptyAction,
}: HomeMediaShelfProps) => (
  <MediaRail
    title={title}
    icon="clock"
    items={items}
    keyExtractor={item => item.id ?? item.fileUri}
    maxItems={maxItems}
    onSeeAll={onSeeAll}
    emptyTitle={emptyTitle}
    emptyDescription={emptyDescription}
    emptyIcon={emptyIcon}
    emptyActionLabel={emptyActionLabel}
    onEmptyAction={onEmptyAction}
    renderItem={item => {
      const hasDuration = typeof item.duration === 'number' && item.duration > 0;
      const progress =
        hasDuration && item.position ? Math.min(1, item.position / (item.duration as number)) : 0;

      return (
        <MediaRailCard
          title={item.title}
          lane={item.mediaType ?? 'video'}
          imageUri={item.resumeThumbnailPath || item.thumbnailPath}
          subtitle={
            hasDuration
              ? `${formatDuration(item.position ?? 0)} / ${formatDuration(item.duration as number)}`
              : undefined
          }
          progress={progress}
          onPress={() => onItemPress(item)}
          onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
          accessibilityLabel={
            hasDuration
              ? `${item.title}, ${formatDuration(item.position ?? 0)} of ${formatDuration(
                  item.duration as number,
                )}`
              : item.title
          }
          accessibilityHint={onItemLongPress ? 'Long press to remove from Recently Played' : undefined}
        />
      );
    }}
  />
);
