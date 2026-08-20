import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '..';
import {resetAppState} from './authSlice';
import type {MediaKind, MediaSource} from '../../types/media';

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

/** Inverted search index: lowercase word → set of track URIs containing that word */
export type SearchIndex = Record<string, Set<string>>;

// ─── Scanner state types ──────────────────────────────

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

interface MediaState {
  /** All scanned audio tracks */
  tracks: ScannedTrack[];
  isScanning: boolean;
  /** Whether a cancellation has been requested */
  cancelRequested: boolean;
  /** Live scan progress */
  scanProgress: ScanProgress;
  /** History of the most recent scan */
  scanHistory: ScanHistory;
  /** Inverted search index for fast text search across tracks */
  searchIndex: SearchIndex;
}

const initialState: MediaState = {
  tracks: [],
  isScanning: false,
  cancelRequested: false,
  scanProgress: {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0},
  scanHistory: EMPTY_SCAN_HISTORY,
  searchIndex: {},
};

// ─── Index builder ─────────────────────────────────────

/** Build inverted search index from a list of tracks. */
function buildSearchIndex(tracks: ScannedTrack[]): SearchIndex {
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

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    setScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
      // Reset cancel flag when starting a new scan
      if (action.payload) {
        state.cancelRequested = false;
        state.scanProgress = {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0};
      }
    },
    setScanProgress(state, action: PayloadAction<ScanProgress>) {
      state.scanProgress = action.payload;
    },
    setScanHistory(state, action: PayloadAction<ScanHistory>) {
      state.scanHistory = action.payload;
    },
    requestCancelScan(state) {
      state.cancelRequested = true;
    },
    clearCancelScan(state) {
      state.cancelRequested = false;
    },
    resetScanState(state) {
      state.isScanning = false;
      state.cancelRequested = false;
      state.scanProgress = {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0};
    },
    setTracks(state, action: PayloadAction<ScannedTrack[]>) {
      state.tracks = action.payload;
      state.searchIndex = buildSearchIndex(action.payload);
    },
    addTracks(state, action: PayloadAction<ScannedTrack[]>) {
      const existingUris = new Set(state.tracks.map(t => t.uri));
      const newTracks = action.payload.filter(t => !existingUris.has(t.uri));
      if (newTracks.length > 0) {
        state.tracks.push(...newTracks);
        // Rebuild index from the new set
        state.searchIndex = buildSearchIndex(state.tracks);
      }
    },
    removeTrack(state, action: PayloadAction<string>) {
      state.tracks = state.tracks.filter(t => t.uri !== action.payload);
      // Rebuild index from the reduced set
      state.searchIndex = buildSearchIndex(state.tracks);
    },
    clearTracks(state) {
      state.tracks = [];
      state.searchIndex = {};
    },
    rebuildSearchIndex(state) {
      state.searchIndex = buildSearchIndex(state.tracks);
    },
  },
  // 49.5: purge media library on global reset (logout)
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.isScanning = false;
      state.cancelRequested = false;
      state.scanProgress = {currentFolder: null, filesFound: 0, totalFiles: 0, percentComplete: 0};
      state.scanHistory = EMPTY_SCAN_HISTORY;
      state.tracks = [];
      state.searchIndex = {};
    });
  },
});

export const {
  setScanning,
  setScanProgress,
  setScanHistory,
  requestCancelScan,
  clearCancelScan,
  resetScanState,
  setTracks,
  addTracks,
  removeTrack,
  clearTracks,
  rebuildSearchIndex,
} = mediaSlice.actions;
export default mediaSlice.reducer;

// ─── Selectors ──────────────────────────────────────────────

const selectMediaState = (state: RootState) => state.media;

export const selectAllTracks = createSelector(
  [selectMediaState],
  s => s.tracks,
);

export const selectIsMediaScanning = createSelector(
  [selectMediaState],
  s => s.isScanning,
);

export const selectSearchIndex = createSelector(
  [selectMediaState],
  s => s.searchIndex,
);

export const selectScanProgress = createSelector(
  [selectMediaState],
  s => s.scanProgress,
);

export const selectScanHistory = createSelector(
  [selectMediaState],
  s => s.scanHistory,
);

export const selectCancelRequested = createSelector(
  [selectMediaState],
  s => s.cancelRequested,
);

/** Total count of scanned tracks (safe for Home screen display, no race condition). */
export const selectTrackCount = createSelector(
  [selectAllTracks],
  tracks => tracks.length,
);

/** Derive the artist catalog from all tracks. */
export const selectArtists = createSelector([selectAllTracks], tracks => {
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
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
});

/** Derive the album catalog from all tracks. */
export const selectAlbums = createSelector([selectAllTracks], tracks => {
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
});

/** Get all tracks for a specific artist. */
export const selectArtistDiscography = createSelector(
  [selectAllTracks, (_: RootState, artistName: string) => artistName],
  (tracks, artist) =>
    tracks.filter(
      t => (t.artist || 'Unknown Artist').toLowerCase() === artist.toLowerCase(),
    ),
);

/** Get all tracks for a specific album by a specific artist. */
export const selectAlbumTracks = createSelector(
  [
    selectAllTracks,
    (_: RootState, albumTitle: string) => albumTitle,
    (_: RootState, __: string, artistName: string) => artistName,
  ],
  (tracks, album, artist) =>
    tracks
      .filter(
        t =>
          (t.album || 'Unknown Album').toLowerCase() === album.toLowerCase() &&
          (t.artist || 'Unknown Artist').toLowerCase() === artist.toLowerCase(),
      )
      .sort((a, b) => a.trackNumber - b.trackNumber),
);
