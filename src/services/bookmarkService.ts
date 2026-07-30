import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Bookmark} from '../store/slices/bookmarkSlice';

const STORAGE_KEY = 'simba_bookmarks';

// ─── CRUD Operations ───────────────────────────────────────

export async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Bookmark[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  try {
    const existing = await loadBookmarks();
    const filtered = existing.filter(item => item.id !== bookmark.id);
    const updated = [bookmark, ...filtered];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail — data is still in Redux
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  try {
    const existing = await loadBookmarks();
    const updated = existing.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail
  }
}

export async function updateBookmarkLabel(
  id: string,
  label: string,
): Promise<void> {
  try {
    const existing = await loadBookmarks();
    const bookmark = existing.find(item => item.id === id);
    if (bookmark) {
      bookmark.label = label;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
    // silently fail
  }
}

export async function clearAllBookmarksInStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
