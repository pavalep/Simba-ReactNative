import {useMemo, useState, useEffect} from 'react';
import {useAppSelector} from '../store';
import {
  selectAllTracks,
  selectArtists,
  selectAlbums,
  selectSearchIndex,
} from '../store/slices/mediaSlice';
import {usePlaylists} from '../features/playlists';

// ─── Types ──────────────────────────────────────────────────

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

/** Extract last segment of a URI/path for display */
const displayNameFromPath = (path: string): string => {
  const segments = path.replace(/\/$/, '').split('/');
  return segments[segments.length - 1] || path;
};

/** Check if a file extension suggests video */
const isVideoExtension = (uri: string): boolean =>
  /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(uri);

// ─── Hook ───────────────────────────────────────────────────

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
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce: 300ms
  useEffect(() => {
    if (!searchText.trim()) {
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText.trim());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Redux data
  const tracks = useAppSelector(selectAllTracks);
  const searchIndex = useAppSelector(selectSearchIndex);
  const artists = useAppSelector(selectArtists);
  const albums = useAppSelector(selectAlbums);
  const {playlists: allPlaylists} = usePlaylists();

  const query = debouncedQuery.toLowerCase();

  // ── Search index lookup for tracks ──
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
        combined = new Set([...(combined as Set<string>)].filter(uri => hitSet.has(uri)));
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

  // ── Build all results ──
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
