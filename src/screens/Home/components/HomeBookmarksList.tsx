// ─── Home Bookmarks Rail ──────────────────────────────────────────
//
// W9.5: this was a vertical list of rows with an always-visible ✕ on
// every one. It now renders the same `MediaRail` / `MediaRailCard` as
// Recently Played, directly above it, so the two shelves read as one
// system — which they are: two records from two stores, same browsing
// gesture, same card, same scroll pitch.
//
// ## What changed and why
//
//   • Horizontal, like every other media rail on the screen. A list of
//     rows inside a horizontally-scrolling page was the odd one out.
//   • Delete moved from a permanent ✕ to a long-press. Material's
//     guidance is that long-press carries secondary and destructive
//     actions, precisely so a permanent control does not have to. It
//     also stops the button from sitting on top of the poster.
//   • The card shows the frame captured at the bookmarked moment when
//     one exists, for the same reason the Recently Played card does:
//     it is a picture of the moment, not of the film.

import React from 'react';
import {MAX_BOOKMARK_ENTRIES} from '../../../state/bookmarksStore';
import {formatDuration} from '../../../utils/timeAgo';
import {MediaRail} from '../../../components/media/MediaRail';
import {MediaRailCard} from '../../../components/media/MediaRailCard';
import type {Bookmark} from '../../../features/bookmarks';

type BookmarkEntry = Bookmark;

interface Props {
  items: BookmarkEntry[];
  onPress: (item: BookmarkEntry) => void;
  /**
   * Takes the whole record, not just the id, because the handler
   * confirms first and the confirmation has to name what it is about
   * to delete. Passing a bare id would have forced the handler to
   * search the list to find the title — or to confirm without one.
   */
  onRemove: (item: BookmarkEntry) => void;
  onSeeAll?: () => void;
}

export const HomeBookmarksList: React.FC<Props> = ({
  items,
  onPress,
  onRemove,
  onSeeAll,
}) => (
  <MediaRail
    title="Bookmarks"
    icon="bookmark"
    items={items}
    keyExtractor={item => item.id}
    maxItems={MAX_BOOKMARK_ENTRIES}
    onSeeAll={onSeeAll}
    emptyTitle="No Bookmarks Yet"
    emptyDescription="Tap the bookmark icon while playing to save a moment — it'll show up here for one-tap access."
    emptyIcon="bookmark"
    renderItem={item => {
      const hasDuration = typeof item.duration === 'number' && item.duration > 0;
      return (
        <MediaRailCard
          title={item.title}
          lane={item.mediaType ?? 'video'}
          imageUri={item.thumbnailPath}
          subtitle={`${formatDuration(item.position)} · ${new Date(
            item.createdAt,
          ).toLocaleDateString()}`}
          onPress={() => onPress(item)}
          onLongPress={() => onRemove(item)}
          accessibilityLabel={`Play ${item.title} at ${formatDuration(item.position)}`}
          accessibilityHint="Long press to remove this bookmark"
        />
      );
    }}
  />
);
