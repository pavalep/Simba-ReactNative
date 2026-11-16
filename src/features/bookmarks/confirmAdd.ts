// ─── Bookmarks — the cap's one owner ─────────────────────────────────
//
// The app stores at most MAX_BOOKMARK_ENTRIES bookmarks. Adding one past
// the cap does NOT add: `addBookmark` returns
// `{status: 'requires-confirmation'}` with the oldest bookmark as the
// candidate, and the CALLER has to ask the user.
//
// Four call sites had to do that, and only two of them did. The Radio
// and Live TV BROWSE screens discarded the result and toasted
// "Station bookmarked" — a false success, with nothing added.
//
// So the confirmation lives here, once, and every caller gets the same
// behaviour.

import {Alert} from 'react-native';
import type {
  BookmarkAddOptions,
  BookmarkAddResult,
  BookmarkInput,
} from './index';

/**
 * Act on an `addBookmark` result.
 *
 * `onAdded` runs when the bookmark really was added (or updated). When
 * the cap needs a decision, the user is asked, and the oldest bookmark is
 * evicted only if they say yes.
 */
export function confirmBookmarkAdd(
  result: BookmarkAddResult,
  title: string,
  add: (
    input: BookmarkInput,
    options?: BookmarkAddOptions,
  ) => BookmarkAddResult,
  onAdded: () => void,
): void {
  if (result.status === 'requires-confirmation') {
    const {candidate, requested} = result;
    Alert.alert(
      'Bookmark limit reached',
      `Adding “${title}” will remove the oldest bookmark “${candidate.title}”. Continue?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove & Add',
          style: 'destructive',
          onPress: () => {
            add(requested, {evictId: candidate.id});
            onAdded();
          },
        },
      ],
    );
    return;
  }

  onAdded();
}
