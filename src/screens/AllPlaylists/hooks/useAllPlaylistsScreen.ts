// ────────────────────────────────────────────────────────
// Simba Player — useAllPlaylistsScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {usePlaylists} from '../../../features/playlists';
import type {FilterType} from '../../../features/library/presentation/types';
import type {Playlist, PlaylistKind} from '../../../types/playlist';

/**
 * When the playlist was pinned, in milliseconds.
 *
 * D-P3: the PINNED order is the RECENCY OF PINNING, not the playlist's own
 * `updatedAt`. The store stamps `pinnedAt` when the pin goes on and drops
 * it when the pin comes off, so it is the only stamp that says "how
 * recently the user pinned this".
 *
 * Home's rail reads the same stamp through its own copy of this helper
 * (`src/screens/Home/hooks/useHomeScreen.ts`). Two copies of one rule is
 * one copy too many — but that helper is Home's, and Home is not this
 * wave's file — so the rule is written out here and the duplication is
 * recorded rather than hidden.
 */
function pinnedAtMs(playlist: Playlist): number {
  return new Date(playlist.pinnedAt ?? playlist.updatedAt ?? playlist.createdAt).getTime();
}

export interface UseAllPlaylistsScreenResult {
  /** Every playlist the user has — the page's source, before the filter. */
  allPlaylists: Playlist[];
  /**
   * The kind filter.
   *
   * A FILTER, not a lane switch: it narrows what the page SHOWS and never
   * changes what a playlist may contain (spec §4.5). A playlist's kind is
   * the domain's business; the chip is the reader's.
   */
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  /** The playlists the filter matches — what the page lists. */
  filteredPlaylists: Playlist[];
  /**
   * The pinned ones, most recently pinned first (D-P3).
   *
   * `filter()` copies, so the sort below cannot reorder the store's array.
   */
  pinnedPlaylists: Playlist[];
  /** The rest, in the store's order. */
  otherPlaylists: Playlist[];
  /**
   * Open a playlist.
   *
   * The card hands over an ID, not the playlist: the ID is what the card
   * rendered, and the name is looked up here so the navigation payload is
   * built in one place. An id that is no longer in the list is a playlist
   * that was deleted while this screen was open — there is nothing to
   * open, so the page does not pretend otherwise.
   */
  handlePlaylistPress: (playlistId: string) => void;
  // The kind is the facade's kind, not a two-value subset of it: the screen
  // opens `PlaylistCreateModal`, which offers `MIXED` as well, and a
  // narrower signature here would silently drop that kind.
  handleCreate: (name: string, kind: PlaylistKind) => void;
  // The pin ACTION (D-P8). This is the MANAGEMENT page, so the pin is
  // reachable without a long-press: a long-press is not reachable by a
  // screen reader or a keyboard, and a pin that can only be reached by a
  // gesture is a pin some users cannot use.
  handleTogglePin: (id: string, pinned: boolean) => void;
}

export function useAllPlaylistsScreen(): UseAllPlaylistsScreenResult {
  const navigation = useNavigation<any>();
  const {
    playlists: allPlaylists,
    createPlaylist: create,
    setPinned,
  } = usePlaylists();

  // The filter starts on ALL: the page opens on everything the user has.
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  const filteredPlaylists = useMemo(() => {
    if (filterType === 'ALL') {
      return allPlaylists;
    }
    return allPlaylists.filter(playlist => playlist.kind === filterType);
  }, [allPlaylists, filterType]);

  const pinnedPlaylists = useMemo(
    () =>
      filteredPlaylists
        .filter(playlist => playlist.pinned)
        .sort((a, b) => pinnedAtMs(b) - pinnedAtMs(a)),
    [filteredPlaylists],
  );

  const otherPlaylists = useMemo(
    () => filteredPlaylists.filter(playlist => !playlist.pinned),
    [filteredPlaylists],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      const playlist = allPlaylists.find(candidate => candidate.id === playlistId);
      if (!playlist) {
        return;
      }
      navigation.navigate('PlaylistDetail', {
        playlistId: playlist.id,
        playlistName: playlist.name,
      });
    },
    [allPlaylists, navigation],
  );

  const handleCreate = useCallback(
    (name: string, kind: PlaylistKind) => {
      create({name, kind});
    },
    [create],
  );

  const handleTogglePin = useCallback(
    (id: string, pinned: boolean) => {
      setPinned(id, pinned);
    },
    [setPinned],
  );

  return {
    allPlaylists,
    filterType,
    setFilterType,
    filteredPlaylists,
    pinnedPlaylists,
    otherPlaylists,
    handlePlaylistPress,
    handleCreate,
    handleTogglePin,
  };
}
