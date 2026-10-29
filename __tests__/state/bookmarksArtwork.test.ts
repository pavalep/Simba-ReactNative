/**
 * The bookmark WRITERS — do they carry the captured frame, and do they
 * keep it?
 *
 * ## Why there are two writers and this test covers both
 *
 * A bookmark is written twice on its way to disk:
 *
 *   1. `dispatchAddBookmark` (`features/bookmarks/index.ts`) builds the
 *      record from the `BookmarkInput` and hands it to the store.
 *   2. `buildBookmark` (`state/bookmarksStore.ts`) rebuilds the record
 *      inside the store, merging it with any existing one.
 *
 * Both had to learn the `resumeThumbnailPath` field. A writer that
 * forgot it would silently drop the frame — the record would persist,
 * look valid, and draw a placeholder forever. So both are asserted.
 *
 * ## The rule being pinned
 *
 * The frame is CARRIED ACROSS an update, not re-derived — the same rule
 * `recentHistoryStore` uses for its own frame. Re-bookmarking a moment
 * must not blank the picture the first bookmark captured.
 */

import {useBookmarksStore} from '../../src/state/bookmarksStore';
import {addBookmark} from '../../src/features/bookmarks';
import type {BookmarkInput} from '../../src/state/bookmarksStore';

const URI = 'file:///movies/film.mkv';
const CAPTURED_FRAME =
  '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_300000.jpg';

function input(over: Partial<BookmarkInput> = {}): BookmarkInput {
  return {
    fileUri: URI,
    title: 'Namus Kanla Yazilir',
    position: 300,
    duration: 600,
    label: '',
    mediaType: 'video',
    type: 'movie',
    source: 'local',
    ...over,
  };
}

describe('bookmark writers — the captured frame', () => {
  beforeEach(() => {
    useBookmarksStore.getState().reset();
  });

  it('the store writer persists the captured frame', () => {
    useBookmarksStore.getState().addBookmark({
      bookmark: input({resumeThumbnailPath: CAPTURED_FRAME}),
    });

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].resumeThumbnailPath).toBe(CAPTURED_FRAME);
  });

  it('the store writer KEEPS the frame when the same moment is re-bookmarked', () => {
    useBookmarksStore.getState().addBookmark({
      bookmark: input({resumeThumbnailPath: CAPTURED_FRAME}),
    });
    const id = useBookmarksStore.getState().items[0].id;

    // The re-bookmark carries no frame of its own — which is exactly
    // what happens when the app has not captured a new one.
    useBookmarksStore.getState().addBookmark({
      bookmark: input({id, resumeThumbnailPath: undefined}),
    });

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].resumeThumbnailPath).toBe(CAPTURED_FRAME);
  });

  it('the feature writer persists the captured frame', () => {
    // `addBookmark` is the public façade the player toggle goes through.
    const result = addBookmark(
      input({resumeThumbnailPath: CAPTURED_FRAME}),
      useBookmarksStore.getState().items,
    );

    expect(result.status).toBe('added');
    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].resumeThumbnailPath).toBe(CAPTURED_FRAME);
  });

  it('the feature writer KEEPS the frame when the same moment is re-bookmarked', () => {
    addBookmark(
      input({resumeThumbnailPath: CAPTURED_FRAME}),
      useBookmarksStore.getState().items,
    );
    const existing = useBookmarksStore.getState().items[0];

    addBookmark(
      input({id: existing.id, resumeThumbnailPath: undefined}),
      useBookmarksStore.getState().items,
    );

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].resumeThumbnailPath).toBe(CAPTURED_FRAME);
  });

  it('writes no frame at all when there is none to carry', () => {
    addBookmark(input(), useBookmarksStore.getState().items);

    const items = useBookmarksStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].resumeThumbnailPath).toBeUndefined();
  });
});
