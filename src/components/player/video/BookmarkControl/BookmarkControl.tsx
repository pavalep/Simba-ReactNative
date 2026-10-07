import * as React from 'react';
import {useToast} from '../../../feedback/Toast';
import {
  PlayerControl,
  CONTROL_ICON_SIZE_COMPACT,
} from '../PlayerControl/PlayerControl';
import {useBookmarkToggle} from '../../../../infrastructure/player/useBookmarkToggle';
import {formatMsAsClock} from '../../../../infrastructure/player';
import {BookmarkOverflowDialog} from '../../../bookmark/BookmarkOverflowDialog/BookmarkOverflowDialog';

/**
 * W9.4 — the player's bookmark control.
 *
 * ## Placement
 *
 * Top bar, right of the orientation lock. That is the position YouTube
 * uses for its save/bookmark control inside the player, and it is where
 * this app's header already keeps *state* actions: back (left), title
 * (centre), lock (right). Bookmarking is a state action on the media,
 * exactly like the lock is a state action on orientation — so it belongs
 * beside the lock.
 *
 * Deliberately NOT in the transport row. That row is the primary action
 * cluster (play/pause, skip) and is read first; parking a low-frequency
 * save there dilutes the thing users reach for mid-playback.
 *
 * ## On / off, and why the glyph changes
 *
 * `bookmark` (outline) → `bookmarkFilled`. Colour alone would not be
 * enough: WCAG 1.4.1 makes colour a non-sufficient signal, and the
 * control is a `switch` in the accessibility tree
 * (`accessibilityRole="switch"` + `accessibilityChecked`), so a screen
 * reader states the state in words. Every reference player pairs the
 * two glyphs — Jellyfin Enhanced, MyVideoSpot, YouTube, Netflix.
 *
 * ## Why it can be absent
 *
 * With no session there is no file to bookmark, so this returns `null`
 * rather than a disabled control. Per SPEC I11 a control that cannot
 * act must not occupy space: a permanently muted icon in the header
 * reads as a broken button, not as an unavailable one.
 */
export const BookmarkControl: React.FC = () => {
  const {show} = useToast();
  const {
    isBookmarkedHere,
    hasAnyBookmark,
    count,
    all,
    onToggle,
    confirmEviction,
    cancelEviction,
    needsEviction,
    positionSec,
    unavailable,
  } = useBookmarkToggle();

  const at = formatMsAsClock(positionSec * 1000);

  const handlePress = React.useCallback(() => {
    // `needsEviction` is settled by the dialog's own effect below, so
    // there is nothing to do here for a full list — `onToggle` has
    // already parked the request.
    if (needsEviction) return;

    const wasBookmarked = isBookmarkedHere;
    onToggle();
    show(
      wasBookmarked ? 'Bookmark removed' : `Bookmarked at ${at}`,
      'success',
    );
  }, [needsEviction, onToggle, isBookmarkedHere, at, show]);

  const handleReplace = React.useCallback(
    (evictId: string) => {
      confirmEviction(evictId);
      show(`Bookmarked at ${at}`, 'success');
    },
    [confirmEviction, at, show],
  );

  // W9.5: a full list parks the write and asks which bookmark to give
  // up. It used to resolve itself by evicting the oldest and offering
  // "Replace" in a toast — a policy the user never chose, applied to
  // their data, with a 6-second window to notice. `onToggle` can only
  // park the request, so the dialog is raised from the effect that
  // observes the park, once.
  React.useEffect(() => {
    if (!needsEviction) return;
    show(`Bookmark list is full (${count}). Choose one to replace.`, 'warning');
  }, [needsEviction, count, show]);

  if (unavailable) return null;

  const hint = isBookmarkedHere
    ? 'Removes the bookmark at this moment'
    : hasAnyBookmark
      ? `Adds a bookmark at ${at}. This title already has ${count} bookmark${count === 1 ? '' : 's'}`
      : `Adds a bookmark at ${at}`;

  return (
    <>
      <PlayerControl
        testID="video-header-bookmark"
        icon={isBookmarkedHere ? 'bookmarkFilled' : 'bookmark'}
        iconSize={CONTROL_ICON_SIZE_COMPACT}
        onPress={handlePress}
        // `switch`, not `button`: this is a two-state control and the
        // accessibility tree should say so rather than report a bare
        // button.
        accessibilityRole="switch"
        accessibilityChecked={isBookmarkedHere}
        accessibilityLabel={isBookmarkedHere ? 'Bookmarked' : 'Bookmark'}
        accessibilityHint={hint}
      />
      {/* Rendered by this control because only this control knows a
          request is parked. It is a Dialog (an RN Modal), so it paints
          above the player chrome regardless of where the chrome sits in
          the tree. */}
      <BookmarkOverflowDialog
        visible={needsEviction}
        bookmarks={all}
        pendingTitle={undefined}
        onRemove={handleReplace}
        onCancel={cancelEviction}
      />
    </>
  );
};

export default BookmarkControl;