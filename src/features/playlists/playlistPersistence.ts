import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Playlist} from '../../types/playlist';
import {normalizePersistedPlaylists} from './playlistReducer';

export const PLAYLIST_STORAGE_KEY = '@simba/playlists/v2';

export async function loadPersistedPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (!raw) return [];
    return normalizePersistedPlaylists(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function persistPlaylists(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlists));
  } catch {
    // Redux Persist remains the primary store snapshot. This adapter is a
    // compatibility-safe feature boundary for callers that need explicit I/O.
  }
}

export async function clearPersistedPlaylists(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAYLIST_STORAGE_KEY);
  } catch {
    // Best-effort cleanup; Redux reset still clears the in-memory authority.
  }
}
