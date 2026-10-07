import * as React from 'react';
import {useToast} from '../../../feedback/Toast';
import {
  PlayerControl,
  CONTROL_ICON_SIZE_COMPACT,
} from '../PlayerControl/PlayerControl';
import {useBookmarkToggle} from '../../../../infrastructure/player/useBookmarkToggle';
import {formatMsAsClock} from '../../../../infrastructure/player';

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
    onToggle,
    confirmEviction,
    needsEviction,
    positionSec,
    unavailable,
  } = useBookmarkToggle();

  const at = formatMsAsClock(positionSec * 1000);

  const handlePress = React.useCallback(() => {
    if (needsEviction) {
      confirmEviction();
      return;
    }

    const wasBookmarked = isBookmarkedHere;
    onToggle();
    show(
      wasBookmarked
        ? 'Bookmark removed'
        : `Bookmarked at ${at}`,
      'success',
    );
  }, [needsEviction, confirmEviction, onToggle, isBookmarkedHere, at, show]);

  // A full list parks the write instead of performing it. That has to be
  // asked about, and it can only be asked about once the hook reports
  // it — so the toast is raised from the effect, not from `onToggle`.
  React.useEffect(() => {
    if (!needsEviction) return;
    show(`Bookmark list is full (${count}). Replace the oldest?`, 'warning', {
      action: {
        label: 'Replace',
        onPress: () => {
          confirmEviction();
          show(`Bookmarked at ${at}`, 'success');
        },
      },
      duration: 6000,
    });
    // Re-raise only when the parked request actually changes.
  }, [needsEviction]); // eslint-disable-line react-hooks/exhaustive-deps

  if (unavailable) return null;

  const hint = isBookmarkedHere
    ? 'Removes the bookmark at this moment'
    : hasAnyBookmark
      ? `Adds a bookmark at ${at}. This title already has ${count} bookmark${count === 1 ? '' : 's'}`
      : `Adds a bookmark at ${at}`;

  return (
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
  );
};

export default BookmarkControl;