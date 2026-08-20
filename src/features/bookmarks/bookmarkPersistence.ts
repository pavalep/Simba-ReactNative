import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Bookmark} from './bookmarkReducer';

const STORAGE_KEY = 'simba_bookmarks';

export async function loadPersistedBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export async function persistBookmarks(items: Bookmark[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Redux remains the source of truth if storage is temporarily unavailable.
  }
}

export async function clearPersistedBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures; the Redux state has already been cleared.
  }
}
