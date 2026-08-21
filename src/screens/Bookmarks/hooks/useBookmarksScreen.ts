import {useCallback, useMemo, useState} from 'react';
import {usePlaybackCommands} from '../../../modules/playback';
import {useBookmarks} from '../../../features/bookmarks';
import type {Bookmark} from '../../../features/bookmarks';

export interface UseBookmarksScreenResult {
  allBookmarks: ReturnType<typeof useBookmarks>['allBookmarks'];
  bookmarkCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBookmarks: ReturnType<typeof useBookmarks>['allBookmarks'];
  handlePress: (item: Bookmark) => void;
  /** Direct removal without confirm dialog */
  removeBookmark: (id: string) => void;
  /** Direct clear all without confirm dialog */
  clearAllBookmarks: () => void;
}

export function useBookmarksScreen(): UseBookmarksScreenResult {
  const {openPlayer} = usePlaybackCommands();
  const {allBookmarks, bookmarkCount, remove, clearAll} = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return allBookmarks;
    const q = searchQuery.toLowerCase();
    return allBookmarks.filter(
      bookmark =>
        bookmark.title.toLowerCase().includes(q) ||
        bookmark.label?.toLowerCase().includes(q) ||
        bookmark.fileUri.toLowerCase().includes(q),
    );
  }, [allBookmarks, searchQuery]);

  const handlePress = useCallback(
    (item: Bookmark) => {
      openPlayer({
        uri: item.fileUri,
        title: item.title,
        duration: item.duration,
        resumePosition: item.position,
        artworkUri: item.thumbnailPath,
        source: item.source,
        type: item.type,
        mediaType: item.mediaType,
        provider: item.provider,
        folderId: item.folderId,
      });
    },
    [openPlayer],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const clearAllBookmarks = useCallback(() => {
    clearAll();
  }, [clearAll]);

  return {
    allBookmarks,
    bookmarkCount,
    searchQuery,
    setSearchQuery,
    filteredBookmarks,
    handlePress,
    removeBookmark,
    clearAllBookmarks,
  };
}
