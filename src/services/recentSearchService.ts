// ─── Recent Search History (persisted) ──────────────────────────────────
// P40.4: last 10 search terms survive restarts via AsyncStorage so users
// can re-run a query from the chips. Best-effort like bookmarkService.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'simba_search_history_v1';
const MAX_ENTRIES = 10;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearches(terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(terms.slice(0, MAX_ENTRIES)),
    );
  } catch {
    // Best-effort — history is not critical.
  }
}
