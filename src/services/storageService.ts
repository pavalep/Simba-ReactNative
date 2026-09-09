// ─── storageService — V21 P06 T06.01 (closes D-005) ────────────────
// AsyncStorage-backed persistence for 3 small pieces of state
// that don't fit into the Zustand store pattern: theme preference,
// recent searches, and linked folders.
//
// Each value is stored under a `simba:` namespaced key so we
// can grep the device's AsyncStorage for any simba-owned key
// (e.g. for a "reset all settings" feature). The keys are:
//   simba:theme                → 'light' | 'dark' | 'system'
//   simba:recentSearches       → JSON array of strings
//   simba:linkedFolders:video  → JSON array of folder paths
//   simba:linkedFolders:audio  → JSON array of folder paths
//
// Reads return defaults on miss ('system' / []); writes are
// fire-and-forget (no return value). This is the same shape
// the V17 placeholder had — the public surface didn't change.
//
// V21 migration note: the underlying store is AsyncStorage.
// The V21 tracker P17 plan is to introduce MMKV in
// `src/infrastructure/persistence/mmkv.ts`; when that lands,
// this file becomes a thin wrapper over the MMKV-backed
// repository. The public surface won't change.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY_THEME = 'simba:theme';
const KEY_RECENT_SEARCHES = 'simba:recentSearches';
const KEY_LINKED_FOLDERS_VIDEO = 'simba:linkedFolders:video';
const KEY_LINKED_FOLDERS_AUDIO = 'simba:linkedFolders:audio';

export async function setThemePreference(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(KEY_THEME, mode);
}

export async function getThemePreference(): Promise<ThemeMode> {
  const v = await AsyncStorage.getItem(KEY_THEME);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

export async function setRecentSearches(searches: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY_RECENT_SEARCHES, JSON.stringify(searches));
}

export async function getRecentSearches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY_RECENT_SEARCHES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function setLinkedFolders(
  type: 'video' | 'audio',
  folders: string[],
): Promise<void> {
  const key = type === 'video' ? KEY_LINKED_FOLDERS_VIDEO : KEY_LINKED_FOLDERS_AUDIO;
  await AsyncStorage.setItem(key, JSON.stringify(folders));
}

export async function getLinkedFolders(
  type: 'video' | 'audio',
): Promise<string[]> {
  const key = type === 'video' ? KEY_LINKED_FOLDERS_VIDEO : KEY_LINKED_FOLDERS_AUDIO;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}
