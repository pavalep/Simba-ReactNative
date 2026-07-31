import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useBookmarks} from '../../hooks/useBookmarks';
import type {Bookmark} from '../../store/slices/bookmarkSlice';

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
  const navigation = useNavigation<any>();
  const {allBookmarks, bookmarkCount, remove, clearAll} = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return allBookmarks;
    const q = searchQuery.toLowerCase();
    return allBookmarks.filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        b.label?.toLowerCase().includes(q) ||
        b.fileUri.toLowerCase().includes(q),
    );
  }, [allBookmarks, searchQuery]);

  const handlePress = useCallback(
    (item: Bookmark) => {
      if (item.mediaType === 'audio') {
        navigation.navigate('AudioPlayer', {
          fileUri: item.fileUri,
          fileTitle: item.title,
          startPosition: item.position,
          // P34.6: restore the stream context (origin + cached art)
          ...(item.source ? {source: item.source} : {}),
          ...(item.thumbnailPath ? {artworkUri: item.thumbnailPath} : {}),
        });
      } else {
        navigation.navigate('VideoPlayer', {
          fileUri: item.fileUri,
          fileTitle: item.title,
          startPosition: item.position,
          ...(item.source ? {source: item.source} : {}),
        });
      }
    },
    [navigation],
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
