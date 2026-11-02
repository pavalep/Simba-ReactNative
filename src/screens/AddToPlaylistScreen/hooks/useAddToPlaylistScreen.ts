/**
 * `useAddToPlaylistScreen` — the data and the rules behind the "Add to
 * playlist" page.
 *
 * ## What this page is
 *
 * `PlaylistSheet` adds ONE item to ONE playlist, from one tile. This page
 * adds MANY items, gathered from more than one section, to ONE playlist.
 * They are different verbs, so they are different surfaces: this hook does
 * not call `PlaylistSheet`, and `PlaylistSheet` does not call this.
 *
 * ## The two rules this page does NOT own
 *
 *  - **"Which playlists may take this item"** is `compatiblePlaylistsFor()`
 *    (`src/features/playlists`). This hook CALLS it, and never re-implements
 *    the lane / allow-list logic.
 *  - **"How a playlist is created"** is `PlaylistCreateModal`
 *    (`src/components/playlist/PlaylistCreateModal`). This hook owns only
 *    whether that modal is open and what happens to the playlist it makes.
 *
 * ## The sections on offer
 *
 * Every section below is a section the app ALREADY enumerates, and every
 * candidate it offers is a thing the player can actually play:
 *
 *  - **Movies** — the Internet Archive movie catalogue, using the same
 *    "All movies" scope the Movies screen uses (`MOVIE_CATEGORIES`'s `all`
 *    query plus the junk filter). An Internet Archive search result carries
 *    the collection's DIRECTORY url, not a file, so a movie is resolved to a
 *    playable file when the user picks it — the same resolution the Movies
 *    screen does before it plays.
 *  - **Music** — Jamendo's popular tracks. `audioUrl` is a playable file.
 *  - **Downloads** — the app's own downloaded files, already classified by
 *    the download service.
 *
 * ## The sections this page does NOT offer, and why
 *
 *  - **Podcasts** — `getTrendingPodcasts()` returns FEEDS. A feed is not a
 *    playable file; its EPISODES are, and they cost a second request per
 *    feed. The app's own podcast surface adds an episode
 *    (`PodcastDetailScreen` → `PlaylistSheet`), which is the honest verb.
 *  - **Archive** — `searchInternetArchiveAudio()` returns COLLECTIONS. A
 *    collection is not a playable file; its TRACKS are, and they cost a
 *    second request per collection. The app's own archive surface adds a
 *    track (`ArchiveItemDetailScreen` → `PlaylistSheet`).
 *
 * Neither is rendered here rather than faked: a row the user can tick but
 * the player cannot play would be a lie.
 */

import {useCallback, useMemo, useState} from 'react';

import {useApiQuery} from '../../../hooks/useApiQuery';
import {getPopularJamendoTracks} from '../../../infrastructure/api/jamendo/adapter';
import {
  resolveInternetArchiveVideoDetails,
  searchInternetArchiveVideos,
} from '../../../infrastructure/api/internetArchive/adapter';
import {MOVIE_CATEGORIES, withJunkFilter} from '../../../constants/movieCategories';
import {useDownloadsStore} from '../../../state';
import {
  compatiblePlaylistsFor,
  reportBatchAdd,
  usePlaylists,
} from '../../../features/playlists';
import type {PlaylistItemInput} from '../../../features/playlists';
import type {Playlist, PlaylistKind} from '../../../types/playlist';
import type {MediaKind, MediaLane} from '../../../types/media';
import type {
  InternetArchiveVideoResult,
  JamendoTrackResult,
  PaginatedResult,
} from '../../../types/api';
import type {DownloadRecord} from '../../../services/downloadService';
import {useToast} from '../../../components/feedback/Toast/Toast';

/** The sections this page can honestly offer. */
export type AddToPlaylistSection = 'movies' | 'music' | 'downloads';

/** How many candidates a section shows. */
const SECTION_LIMIT = 20;

/**
 * The app's own "All movies" scope — the Movies screen's default query, with
 * the same junk filter, so both surfaces browse the same catalogue.
 */
const ALL_MOVIES_QUERY = withJunkFilter(
  MOVIE_CATEGORIES.find(category => category.id === 'all')?.query ??
    'collection:(feature_films OR silent_films OR short_films)',
);

/**
 * One thing the user can tick on this page.
 *
 * `item` is present when the playable URI is already known. `resolve` is
 * present when it is not (a movie), and it returns `null` when the item
 * turns out to have no playable file — that is a real outcome, and the page
 * says so rather than pretending the pick worked.
 */
export interface AddToPlaylistCandidate {
  /** Stable within the page — the source's own identity. */
  key: string;
  title: string;
  subtitle?: string;
  thumbnailPath?: string;
  /** The semantic kind — the thing the playlist rule classifies. */
  kind: MediaKind;
  /** The playback lane — the thing the user sees on the row. */
  lane: MediaLane;
  /** The playlist item, when the playable URI is already known. */
  item?: PlaylistItemInput;
  /** Resolves the playable URI when it is not known yet. */
  resolve?: () => Promise<PlaylistItemInput | null>;
}

/** An Internet Archive movie — playable only once it is resolved. */
function movieCandidate(movie: InternetArchiveVideoResult): AddToPlaylistCandidate {
  return {
    key: `movie:${movie.identifier}`,
    title: movie.title,
    ...(movie.creator ? {subtitle: movie.creator} : {}),
    ...(movie.imageUrl ? {thumbnailPath: movie.imageUrl} : {}),
    kind: 'movie',
    lane: 'video',
    resolve: async () => {
      const details = await resolveInternetArchiveVideoDetails(movie.identifier);
      // A details result whose stream url still ends in "/" is the
      // collection's DIRECTORY, not a file. The app refuses to play those
      // (the Movies screen's "No Video File"), so this page refuses to add
      // them too.
      if (!details || !details.streamingUrl || details.streamingUrl.endsWith('/')) {
        return null;
      }
      return {
        fileUri: details.streamingUrl,
        title: movie.title,
        // SECONDS, unconverted. `PlaylistItem.duration` is seconds
        // everywhere else — the media store, the bookmarks store, the
        // scanner, the queue — and the IA adapter already parses
        // `runtime` into seconds. Converting here would store a 96-minute
        // film as 1600 hours.
        duration: Math.round(details.duration ?? movie.duration ?? 0),
        ...(movie.creator ? {artist: movie.creator} : {}),
        ...(movie.imageUrl ? {thumbnailPath: movie.imageUrl} : {}),
        source: 'api',
        provider: 'internetArchive',
        type: 'movie',
        mediaType: 'video',
      };
    },
  };
}

/** A Jamendo track — `audioUrl` is already a playable file. */
function musicCandidate(track: JamendoTrackResult): AddToPlaylistCandidate {
  return {
    key: `music:${track.id}`,
    title: track.name,
    ...(track.artistName ? {subtitle: track.artistName} : {}),
    ...(track.imageUrl ? {thumbnailPath: track.imageUrl} : {}),
    kind: 'music',
    lane: 'audio',
    item: {
      fileUri: track.audioUrl,
      title: track.name,
      // SECONDS, unconverted — the unit the playlist stores, and the unit
      // Jamendo's API already answers in.
      duration: Math.round(track.duration ?? 0),
      ...(track.artistName ? {artist: track.artistName} : {}),
      ...(track.albumName ? {album: track.albumName} : {}),
      ...(track.imageUrl ? {thumbnailPath: track.imageUrl} : {}),
      source: 'api',
      provider: 'jamendo',
      type: 'music',
      mediaType: 'audio',
    },
  };
}

/**
 * A downloaded file. The record keeps the URI it was downloaded FROM; the
 * player maps it back to the local copy when it goes offline, exactly as it
 * does for every other playback entry point.
 */
function downloadCandidate(record: DownloadRecord): AddToPlaylistCandidate {
  return {
    key: `download:${record.uri}`,
    title: record.title,
    kind: record.type,
    lane: record.mediaType,
    item: {
      fileUri: record.uri,
      title: record.title,
      duration: 0,
      source: record.source,
      provider: record.provider,
      type: record.type,
      mediaType: record.mediaType,
    },
  };
}

export interface UseAddToPlaylistScreenResult {
  section: AddToPlaylistSection;
  setSection: (section: AddToPlaylistSection) => void;
  candidates: AddToPlaylistCandidate[];
  isLoading: boolean;
  /** The section's own error, when the section could not be read. */
  error: string | null;
  /** The candidate keys that are ticked, mapped to their playlist item. */
  selected: Record<string, PlaylistItemInput>;
  selectedCount: number;
  isSelected: (key: string) => boolean;
  toggleCandidate: (candidate: AddToPlaylistCandidate) => void;
  /** True while a candidate is being resolved to a playable file. */
  isResolving: (key: string) => boolean;
  playlists: Playlist[];
  /** The playlists that may take EVERY ticked item — the one rule. */
  compatiblePlaylists: Playlist[];
  targetId: string | null;
  target: Playlist | null;
  setTargetId: (playlistId: string) => void;
  /** Creates a playlist through the one create owner. */
  handleCreate: (name: string, kind: PlaylistKind) => void;
  /** Adds the ticked items to the target playlist. */
  handleAdd: () => void;
}

export function useAddToPlaylistScreen(
  initialPlaylistId?: string,
): UseAddToPlaylistScreenResult {
  const toast = useToast();
  const {playlists, createPlaylist, addItem} = usePlaylists();

  const [section, setSection] = useState<AddToPlaylistSection>('music');
  const [selected, setSelected] = useState<Record<string, PlaylistItemInput>>({});
  const [resolving, setResolving] = useState<Set<string>>(() => new Set<string>());
  const [targetId, setTargetId] = useState<string | null>(initialPlaylistId ?? null);

  const moviesQuery = useApiQuery<PaginatedResult<InternetArchiveVideoResult>>({
    queryKey: ['ia', 'movies', 'add-to-playlist'],
    queryFn: () =>
      searchInternetArchiveVideos(ALL_MOVIES_QUERY, {
        limit: SECTION_LIMIT,
        page: 1,
      }),
    enabled: section === 'movies',
    staleTime: 300000,
  });

  const musicQuery = useApiQuery<JamendoTrackResult[]>({
    queryKey: ['jamendo', 'popular', 'add-to-playlist'],
    queryFn: () => getPopularJamendoTracks(SECTION_LIMIT, 1),
    enabled: section === 'music',
    staleTime: 300000,
  });

  const downloads = useDownloadsStore(state => state.records);

  const candidates = useMemo<AddToPlaylistCandidate[]>(() => {
    if (section === 'movies') {
      return (moviesQuery.data?.items ?? []).map(movieCandidate);
    }
    if (section === 'music') {
      return (musicQuery.data ?? []).map(musicCandidate);
    }
    return downloads.map(downloadCandidate);
  }, [section, moviesQuery.data, musicQuery.data, downloads]);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);

  // ONE rule: `compatiblePlaylistsFor` decides which playlists may take an
  // item. When several items are ticked, a playlist must be able to take
  // ALL of them, so the answer is the intersection of the rule's answers.
  const compatiblePlaylists = useMemo(() => {
    if (selectedItems.length === 0) {
      return playlists;
    }
    return selectedItems.reduce((allowed, item) => {
      const permitted = new Set(
        compatiblePlaylistsFor(item, playlists).map(playlist => playlist.id),
      );
      return allowed.filter(playlist => permitted.has(playlist.id));
    }, playlists);
  }, [playlists, selectedItems]);

  const target = useMemo(
    () => playlists.find(playlist => playlist.id === targetId) ?? null,
    [playlists, targetId],
  );

  const isSelected = useCallback(
    (key: string) => Object.prototype.hasOwnProperty.call(selected, key),
    [selected],
  );

  const isResolving = useCallback((key: string) => resolving.has(key), [resolving]);

  const toggleCandidate = useCallback(
    async (candidate: AddToPlaylistCandidate) => {
      if (isSelected(candidate.key)) {
        setSelected(previous => {
          const next = {...previous};
          delete next[candidate.key];
          return next;
        });
        return;
      }

      if (!candidate.item) {
        if (!candidate.resolve) {
          return;
        }
        setResolving(previous => {
          const next = new Set(previous);
          next.add(candidate.key);
          return next;
        });
        let resolved: PlaylistItemInput | null = null;
        let unreachable = false;
        try {
          resolved = await candidate.resolve();
        } catch {
          // The archive could not be reached for this movie — that is a
          // different failure from "this movie has no video file", and the
          // message below says which one happened.
          unreachable = true;
        } finally {
          setResolving(previous => {
            const next = new Set(previous);
            next.delete(candidate.key);
            return next;
          });
        }
        if (!resolved) {
          toast.show(
            unreachable
              ? 'Could not reach the archive for this movie'
              : 'This movie has no playable video file',
            'error',
          );
          return;
        }
        setSelected(previous => ({...previous, [candidate.key]: resolved}));
        return;
      }

      setSelected(previous => ({
        ...previous,
        [candidate.key]: candidate.item as PlaylistItemInput,
      }));
    },
    [isSelected, toast],
  );

  const handleCreate = useCallback(
    (name: string, kind: PlaylistKind) => {
      const result = createPlaylist({name, kind});
      if (result.status === 'limit-reached') {
        toast.show(`You can have up to ${result.max} playlists`, 'error');
        return;
      }
      setTargetId(result.playlist.id);
      toast.show(`Created "${result.playlist.name}"`, 'success');
    },
    [createPlaylist, toast],
  );

  const handleAdd = useCallback(() => {
    if (!target) {
      toast.show('Pick a playlist to add to', 'warning');
      return;
    }
    if (selectedItems.length === 0) {
      return;
    }
    const results = selectedItems.map(item => addItem(target.id, item));
    const report = reportBatchAdd(results, target.name);
    toast.show(report.message, report.severity);
    setSelected({});
  }, [addItem, selectedItems, target, toast]);

  const isLoading =
    (section === 'movies' && moviesQuery.isLoading) ||
    (section === 'music' && musicQuery.isLoading);

  const error =
    section === 'movies'
      ? moviesQuery.error?.message ?? null
      : section === 'music'
        ? musicQuery.error?.message ?? null
        : null;

  return {
    section,
    setSection,
    candidates,
    isLoading,
    error,
    selected,
    selectedCount: selectedItems.length,
    isSelected,
    toggleCandidate,
    isResolving,
    playlists,
    compatiblePlaylists,
    targetId,
    target,
    setTargetId,
    handleCreate,
    handleAdd,
  };
}
