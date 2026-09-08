// ─── In-Memory Local Search Hook ───────────────────────────────────────
// V20.5: the manual debounce triplet (searchText + debouncedQuery +
// isSearching + the useEffect for the 300ms timer) is replaced by the
// `useDebounce` primitive that's already in `src/hooks/`. The
// "isSearching" flag is gone — the consumer can derive it as
// `searchText !== debouncedText` if needed.
//
// Per the V18.6.2a ideal, the SearchBar already debounces via
// `onDebouncedChange` for the REMOTE search (driven by
// `useAggregatedSearch`). The LOCAL search (this hook) keeps
// its own debounce for the in-memory filter — the cost of
// filtering 10,000 tracks on every keystroke is non-trivial,
// and the user-perceived "smooth" feedback is what we want
// to preserve. The `useDebounce` primitive owns the timer
// + cleanup, so this hook is the 7-result-category builder
// + 2 small state pieces (searchText + debouncedQuery).
//
// Junior-dev rule: 1 useState (controlled echo) + 1
// useDebounce primitive (the timer) + 4 useMemos (the
// result builder). The 7 categories of in-memory results
// (recent / videos / audio / artists / albums / playlists /
// folders) are computed locally because they all live in
// the Zustand stores and are already in memory.

import {useMemo, useState} from 'react';
import {usePlaylists} from '../features/playlists';
import {
  useMediaStore,
  useMediaSearchIndex,
  useMediaArtists,
  useMediaAlbums,
} from '../state';
import {useDebounce} from './useDebounce';

export type SearchResultGroup =
  | 'recent'
  | 'videos'
  | 'audio'
  | 'artists'
  | 'albums'
  | 'playlists'
  | 'folders';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  group: SearchResultGroup;
  fileUri?: string;
  thumbnailPath?: string;
  position?: number;
  duration?: number;
  lastPlayedAt?: string;
  relevanceScore: number;
  navigateTo?: {
    screen?: string;
    route?: string;
    params?: Record<string, any>;
  };
}

interface UseSearchReturn {
  searchText: string;
  setSearchText: (text: string) => void;
  debouncedQuery: string;
  allResults: SearchResultItem[];
  isSearching: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

const displayNameFromPath = (path: string): string => {
  const segments = path.replace(/\/$/, '').split('/');
  return segments[segments.length - 1] || path;
};

const isVideoExtension = (uri: string): boolean =>
  /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(uri);

export function useSearch(
  recentFiles: Array<{
    fileUri: string;
    title: string;
    thumbnailPath?: string;
    position?: number;
    duration?: number;
    lastPlayedAt?: string;
  }>,
  playlist: Array<{uri: string; title: string; duration?: number}>,
  videoFolders: string[],
  audioFolders: string[],
): UseSearchReturn {
  // Controlled-input echo (the SearchBar's `value` prop).
  const [searchText, setSearchText] = useState('');
  // Debounced value used for the actual filter. Owned by
  // the shared `useDebounce` primitive.
  const debouncedQuery = useDebounce(searchText, SEARCH_DEBOUNCE_MS);
  // True while the user's input hasn't yet settled to the
  // debounced value. The legacy hook exposed this; we keep
  // it for API compat (it can be derived but the call site
  // may want it).
  const isSearching = searchText.trim() !== debouncedQuery.trim();

  const tracks = useMediaStore(s => s.tracks);
  const searchIndex = useMediaSearchIndex();
  const artists = useMediaArtists();
  const albums = useMediaAlbums();
  const {playlists: allPlaylists} = usePlaylists();

  const query = debouncedQuery.toLowerCase();

  // Search index lookup for tracks
  const indexHitUris = useMemo((): Set<string> | null => {
    if (!query) return null;
    const words = query.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;

    let combined: Set<string> | null = null;
    for (const word of words) {
      const hitSet = searchIndex[word];
      if (!hitSet) return new Set();
      if (combined === null) {
        combined = new Set(hitSet);
      } else {
        combined = new Set(
          [...(combined as Set<string>)].filter(uri => hitSet.has(uri)),
        );
      }
    }
    return combined ?? new Set();
  }, [query, searchIndex]);

  // Substring matching for partial queries
  const indexSubstringUris = useMemo((): Set<string> | null => {
    if (!query) return null;
    const matches = new Set<string>();
    for (const [word, uris] of Object.entries(searchIndex)) {
      if (word.includes(query)) {
        for (const uri of uris) matches.add(uri);
      }
    }
    return matches;
  }, [query, searchIndex]);

  // Build all results (one giant useMemo for the 7 categories)
  const allResults = useMemo((): SearchResultItem[] => {
    if (!query) return [];

    const items: SearchResultItem[] = [];

    // 1. Audio tracks (via search index)
    tracks.forEach(track => {
      const inIndex =
        indexHitUris?.has(track.uri) || indexSubstringUris?.has(track.uri);
      const titleMatch = track.title.toLowerCase().includes(query);
      const artistMatch = track.artist?.toLowerCase().includes(query);
      const albumMatch = track.album?.toLowerCase().includes(query);

      if (inIndex || titleMatch || artistMatch || albumMatch) {
        const score = track.title.toLowerCase().indexOf(query) === 0
          ? 100
          : artistMatch
            ? 80
            : albumMatch
              ? 70
              : 50;
        items.push({
          id: `track-${track.uri}`,
          title: track.title,
          subtitle: track.artist,
          group: 'audio',
          fileUri: track.uri,
          thumbnailPath: track.albumArtUri,
          duration: track.duration,
          relevanceScore: score,
        });
      }
    });

    // 2. Artists
    artists.forEach(artist => {
      if (artist.name.toLowerCase().includes(query)) {
        items.push({
          id: `artist-${artist.name}`,
          title: artist.name,
          subtitle: `${artist.trackCount} ${artist.trackCount === 1 ? 'track' : 'tracks'} · ${artist.albumCount} ${artist.albumCount === 1 ? 'album' : 'albums'}`,
          group: 'artists',
          relevanceScore: artist.name.toLowerCase().indexOf(query) === 0 ? 95 : 50,
          navigateTo: {
            route: 'ArtistDetail',
            params: {artistName: artist.name},
          },
        });
      }
    });

    // 3. Albums
    albums.forEach(album => {
      if (
        album.title.toLowerCase().includes(query) ||
        album.artist.toLowerCase().includes(query)
      ) {
        items.push({
          id: `album-${album.artist}|${album.title}`,
          title: album.title,
          subtitle: `${album.artist} · ${album.trackCount} ${album.trackCount === 1 ? 'track' : 'tracks'}`,
          group: 'albums',
          thumbnailPath: album.albumArtUri,
          relevanceScore: album.title.toLowerCase().indexOf(query) === 0 ? 95 : 50,
          navigateTo: {
            route: 'AlbumDetail',
            params: {albumTitle: album.title, artistName: album.artist},
          },
        });
      }
    });

    // 4. Playlists
    allPlaylists.forEach(pl => {
      if (pl.name.toLowerCase().includes(query)) {
        items.push({
          id: `playlist-${pl.id}`,
          title: pl.name,
          subtitle: `${pl.items.length} ${pl.items.length === 1 ? 'item' : 'items'}`,
          group: 'playlists',
          relevanceScore: pl.name.toLowerCase().indexOf(query) === 0 ? 90 : 45,
          navigateTo: {
            route: 'PlaylistDetail',
            params: {playlistId: pl.id, playlistName: pl.name},
          },
        });
      }
    });

    // 5. Recent files
    recentFiles.forEach(entry => {
      if (entry.title.toLowerCase().includes(query)) {
        items.push({
          id: `recent-${entry.fileUri}`,
          title: entry.title,
          group: isVideoExtension(entry.fileUri) ? 'videos' : 'audio',
          fileUri: entry.fileUri,
          thumbnailPath: entry.thumbnailPath,
          position: entry.position,
          duration: entry.duration,
          lastPlayedAt: entry.lastPlayedAt,
          relevanceScore: entry.title.toLowerCase().indexOf(query) === 0 ? 100 : 50,
        });
      }
    });

    // 6. Player queue
    playlist.forEach(entry => {
      if (entry.title.toLowerCase().includes(query)) {
        items.push({
          id: `queue-${entry.uri}`,
          title: entry.title,
          group: isVideoExtension(entry.uri) ? 'videos' : 'audio',
          fileUri: entry.uri,
          duration: entry.duration,
          relevanceScore: entry.title.toLowerCase().indexOf(query) === 0 ? 90 : 45,
        });
      }
    });

    // 7. Linked folder paths
    for (const folder of videoFolders) {
      const name = displayNameFromPath(folder);
      if (name.toLowerCase().includes(query)) {
        items.push({
          id: `video-folder-${folder}`,
          title: name,
          subtitle: folder,
          group: 'folders',
          relevanceScore: 30,
          navigateTo: {
            route: 'FolderBrowser',
            params: {initialPath: folder},
          },
        });
      }
    }
    for (const folder of audioFolders) {
      const name = displayNameFromPath(folder);
      if (name.toLowerCase().includes(query)) {
        items.push({
          id: `audio-folder-${folder}`,
          title: name,
          subtitle: folder,
          group: 'folders',
          relevanceScore: 30,
          navigateTo: {
            route: 'FolderBrowser',
            params: {initialPath: folder},
          },
        });
      }
    }

    return items;
  }, [
    query, tracks, indexHitUris, indexSubstringUris,
    artists, albums, allPlaylists, recentFiles, playlist, videoFolders, audioFolders,
  ]);

  return {
    searchText,
    setSearchText,
    debouncedQuery,
    allResults,
    isSearching,
  };
}
