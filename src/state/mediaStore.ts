import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {useMemo} from 'react';
import {createJSONStorage, sharedAsyncStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {MediaKind, MediaSource} from '../types/media';

// ─── Types ──────────────────────────────────────────────────

export interface ScannedTrack {
  /** Unique file URI */
  uri: string;
  /** Display title (parsed from metadata or filename) */
  title: string;
  /** Artist name, or 'Unknown Artist' */
  artist: string;
  /** Album name, or 'Unknown Album' */
  album: string;
  /** Release year */
  year: number;
  /** Genre tag */
  genre: string;
  /** Track number within the album */
  trackNumber: number;
  /** Duration in seconds */
  duration: number;
  /** Absolute path to cover art image, or empty */
  albumArtUri: string;
  /** The parent folder path for grouping */
  folderPath: string;
  /** Stable linked-folder identity for rescan and downstream joins. */
  folderId: string;
  /** Coarse provenance used by badges, filters, and persistence. */
  source: MediaSource;
  /** Product-facing semantic kind used by badges and content-area grouping. */
  type: MediaKind;
  /** Whether this is an 'audio' or 'video' playback lane. */
  mediaType: 'audio' | 'video';
  /** Optional provider/catalog name for API-backed entries. */
  provider?: string;
  /** Optional file size in bytes; populated by scanners that expose it. */
  sizeBytes?: number;
  /** Optional filesystem/import timestamp in epoch milliseconds. */
  dateAdded?: number;
}

export interface ArtistEntry {
  name: string;
  albumCount: number;
  trackCount: number;
  /** Sorted list of album names by this artist */
  albums: string[];
}

export interface AlbumEntry {
  title: string;
  artist: string;
  year: number;
  trackCount: number;
  totalDuration: number;
  albumArtUri: string;
}

/** Inverted search index: lowercase word → set of track URIs containing that word.
 *
 * This type is still exported for consumers (notably `useSearch`) but
 * the index itself is no longer stored in the redux state — it's a
 * memoized derived value computed from `tracks`. */
export type SearchIndex = Record<string, Set<string>>;

export interface ScanProgress {
  /** The folder currently being scanned, or null */
  currentFolder: string | null;
  /** Total files found so far (cumulative across folders) */
  filesFound: number;
  /** Estimated total files across all folders (0 if unknown) */
  totalFiles: number;
  /** Completion percentage 0–100 */
  percentComplete: number;
}

export interface ScanHistory {
  lastScanTime: number | null;
  filesAdded: number;
  filesRemoved: number;
  errorsCount: number;
  unsupportedCount: number;
}

export const EMPTY_SCAN_HISTORY: ScanHistory = {
  lastScanTime: null,
  filesAdded: 0,
  filesRemoved: 0,
  errorsCount: 0,
  unsupportedCount: 0,
};

// ─── Index builder (derived, not stored) ──────────────────

/** Build the inverted search index from a list of tracks.
 *
 * V16 out-of-scope fix: the redux slice used to store this index
 * inside the slice state and rebuild it on every setTracks /
 * addTracks / removeTrack / clearTracks action (the N+1 problem —
 * 1 track change = full re-index of all tracks). With zustand the
 * index is a *derived* value: it lives next to `buildSearchIndex`
 * as a pure function, and consumers (notably `useSearch`) memoize
 * on the `tracks` reference. The cost is paid only when `tracks`
 * actually changes, and the same reference is reused otherwise.
 */
export function buildSearchIndex(tracks: ScannedTrack[]): SearchIndex {
  const index: SearchIndex = {};
  const addWord = (word: string, uri: string) => {
    if (!word) return;
    const normalized = word.toLowerCase();
    if (!index[normalized]) index[normalized] = new Set();
    index[normalized].add(uri);
  };

  for (const t of tracks) {
    // Index title words
    t.title.split(/[\s,.-]+/).forEach(w => addWord(w, t.uri));
    // Index full title for prefix matching
    addWord(t.title, t.uri);
    // Index artist words
    if (t.artist && t.artist !== 'Unknown Artist') {
      t.artist.split(/[\s,.-]+/).forEach(w => addWord(w, t.uri));
      addWord(t.artist, t.uri);
    }
    // Index album words
    if (t.album && t.album !== 'Unknown Album') {
      t.album.split(/[\s,.-]+/).forEach(w => addWord(w, t.uri));
      addWord(t.album, t.uri);
    }
  }

  return index;
}

// ─── Store ──────────────────────────────────────────────────

export interface MediaState {
  /** All scanned audio tracks */
  tracks: ScannedTrack[];
  isScanning: boolean;
  /** Whether a cancellation has been requested */
  cancelRequested: boolean;
  /** Live scan progress */
  scanProgress: ScanProgress;
  /** History of the most recent scan */
  scanHistory: ScanHistory;
}

export interface MediaActions {
  setScanning: (scanning: boolean) => void;
  setScanProgress: (progress: ScanProgress) => void;
  setScanHistory: (history: ScanHistory) => void;
  requestCancelScan: () => void;
  clearCancelScan: () => void;
  resetScanState: () => void;
  setTracks: (tracks: ScannedTrack[]) => void;
  addTracks: (tracks: ScannedTrack[]) => void;
  removeTrack: (uri: string) => void;
  clearTracks: () => void;
  /** Phase 80: the old `rebuildSearchIndex` action is a no-op now
   * that the index is derived. Kept as a function for backwards
   * compatibility (no-op body) so existing dispatch call sites
   * (e.g. any persisted redux dispatch in migration code) don't
   * crash. New code should just leave it out. */
  rebuildSearchIndex: () => void;
  reset: () => void;
}

const initialState: MediaState = {
  tracks: [],
  isScanning: false,
  cancelRequested: false,
  scanProgress: {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0},
  scanHistory: EMPTY_SCAN_HISTORY,
};

export const useMediaStore = create<MediaState & MediaActions>()(
  persist(
    (set) => ({
      ...initialState,

      setScanning: (isScanning) =>
        set((s) =>
          isScanning
            ? {
                isScanning: true,
                cancelRequested: false,
                scanProgress: {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0},
              }
            : {isScanning},
        ),

      setScanProgress: (scanProgress) => set({scanProgress}),

      setScanHistory: (scanHistory) => set({scanHistory}),

      requestCancelScan: () => set({cancelRequested: true}),
      clearCancelScan: () => set({cancelRequested: false}),

      resetScanState: () =>
        set({
          isScanning: false,
          cancelRequested: false,
          scanProgress: {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0},
        }),

      setTracks: (tracks) => set({tracks}),

      addTracks: (incoming) =>
        set((s) => {
          if (incoming.length === 0) return s;
          const existingUris = new Set(s.tracks.map(t => t.uri));
          const newTracks = incoming.filter(t => !existingUris.has(t.uri));
          if (newTracks.length === 0) return s;
          return {tracks: [...s.tracks, ...newTracks]};
        }),

      removeTrack: (uri) =>
        set((s) => ({tracks: s.tracks.filter(t => t.uri !== uri)})),

      clearTracks: () => set({tracks: []}),

      // Phase 80: no-op. The index is now a memoized derived value
      // (see `useSearch` + `buildSearchIndex`).
      rebuildSearchIndex: () => {
        /* intentionally empty */
      },

      reset: () => set({...initialState}),
    }),
    {
      name: 'media',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedAsyncStorage),
    },
  ),
);

// ─── Derived selectors (memoize at the call site) ──────────

/** Memoized accessor for the search index. Returns the SAME
 * reference when `tracks` hasn't changed, so React doesn't
 * re-render consumers that only depend on the index. */
export function useMediaSearchIndex(): SearchIndex {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(() => buildSearchIndex(tracks), [tracks]);
}

/** Derive the artist catalog from all tracks (was `selectArtists`). */
export function useMediaArtists(): ArtistEntry[] {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(() => {
    const map = new Map<string, ArtistEntry>();
    for (const t of tracks) {
      const artist = t.artist || 'Unknown Artist';
      let entry = map.get(artist);
      if (!entry) {
        entry = {name: artist, albumCount: 0, trackCount: 0, albums: []};
        map.set(artist, entry);
      }
      entry.trackCount += 1;
      if (!entry.albums.includes(t.album)) {
        entry.albums.push(t.album);
        entry.albumCount += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);
}

/** Derive the album catalog from all tracks (was `selectAlbums`). */
export function useMediaAlbums(): AlbumEntry[] {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(() => {
    const map = new Map<string, AlbumEntry>();
    for (const t of tracks) {
      const key = `${t.artist}|${t.album}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          title: t.album || 'Unknown Album',
          artist: t.artist || 'Unknown Artist',
          year: t.year,
          trackCount: 0,
          totalDuration: 0,
          albumArtUri: t.albumArtUri,
        };
        map.set(key, entry);
      }
      entry.trackCount += 1;
      entry.totalDuration += t.duration;
      // Prefer newer year
      if (t.year > entry.year) entry.year = t.year;
      // Prefer first non-empty cover art
      if (t.albumArtUri && !entry.albumArtUri) entry.albumArtUri = t.albumArtUri;
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [tracks]);
}

/** Tracks where `mediaType === 'audio'` (was `selectAudioTracks`). */
export function useMediaAudioTracks(): ScannedTrack[] {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(() => tracks.filter(t => t.mediaType === 'audio'), [tracks]);
}

/** Tracks where `mediaType === 'video'` (was `selectVideoTracks`). */
export function useMediaVideoTracks(): ScannedTrack[] {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(() => tracks.filter(t => t.mediaType === 'video'), [tracks]);
}

/** Local video tracks (was `selectLocalVideos`). Filters on
 * `source === 'local'` AND `mediaType === 'video'`. */
export function useMediaLocalVideos(): ScannedTrack[] {
  const tracks = useMediaStore(s => s.tracks);
  return useMemo(
    () => tracks.filter(t => t.source === 'local' && t.mediaType === 'video'),
    [tracks],
  );
}
