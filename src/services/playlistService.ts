// ─── playlistService — V21 P06 T06.02 (closes D-006) ────────────────
// Persistent playlist service backed by AsyncStorage.
//
// The pre-V21 service kept playlists in a private in-memory array
// (D-006: the loadPlaylists() was a TODO returning the empty array).
// The post-V21 service persists on every write and loads on the
// first read.
//
// Storage key: `simba:playlists` (JSON-encoded `Playlist[]`).
// The key is the same one the V18.5+ `playlistsStore` writes via
// Zustand's `persist` middleware — but that store was only
// persisting the user's "now playing" state, not the list of
// playlists. This service is the canonical owner of the
// playlist list.
//
// V21 migration note: the underlying store is AsyncStorage.
// The V21 tracker P17 plan is to introduce MMKV in
// `src/infrastructure/persistence/mmkv.ts`; when that lands,
// this file becomes a thin wrapper over the MMKV-backed
// repository. The public surface won't change.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {MediaFile, Playlist} from '../types';

const KEY = 'simba:playlists';

async function load(): Promise<Playlist[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Playlist[]) : [];
  } catch {
    return [];
  }
}

async function persist(playlists: Playlist[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(playlists));
}

function nextId(): string {
  // Date.now() is good enough for an in-process id; collisions
  // across processes are vanishingly unlikely for a single-user
  // app. A UUID library would be overkill for the V21 scope.
  return Date.now().toString();
}

class PlaylistService {
  private playlists: Playlist[] = [];
  private loaded = false;

  async loadPlaylists(): Promise<Playlist[]> {
    if (!this.loaded) {
      this.playlists = await load();
      this.loaded = true;
    }
    return this.playlists;
  }

  async createPlaylist(title: string, files?: MediaFile[]): Promise<Playlist> {
    // Ensure the cache is warm before we mutate.
    if (!this.loaded) {
      this.playlists = await load();
      this.loaded = true;
    }
    const playlist: Playlist = {
      id: nextId(),
      title,
      files: files ?? [],
    };
    this.playlists.push(playlist);
    await persist(this.playlists);
    return playlist;
  }

  async addToPlaylist(playlistId: string, file: MediaFile): Promise<void> {
    if (!this.loaded) {
      this.playlists = await load();
      this.loaded = true;
    }
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    playlist.files.push(file);
    await persist(this.playlists);
  }

  async removeFromPlaylist(playlistId: string, fileIndex: number): Promise<void> {
    if (!this.loaded) {
      this.playlists = await load();
      this.loaded = true;
    }
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist || fileIndex < 0 || fileIndex >= playlist.files.length) return;
    playlist.files.splice(fileIndex, 1);
    await persist(this.playlists);
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    if (!this.loaded) {
      this.playlists = await load();
      this.loaded = true;
    }
    this.playlists = this.playlists.filter(p => p.id !== playlistId);
    await persist(this.playlists);
  }

  /**
   * Test-only escape hatch — clears the in-memory cache so the
   * next `loadPlaylists()` re-reads from AsyncStorage. Not part
   * of the public surface; production code never calls this.
   */
  _resetForTests(): void {
    this.playlists = [];
    this.loaded = false;
  }
}

export const playlistService = new PlaylistService();
