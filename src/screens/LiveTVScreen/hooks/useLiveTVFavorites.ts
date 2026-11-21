// ─── Live TV — the favourites ─────────────────────────────────────────
//
// ONE owner for "which channels has the user saved", in two halves:
//
//   • `useLiveTVFavorites`      — the READ side. It subscribes to the
//     store, so it belongs to the SCREEN (one subscription for the whole
//     list), not to a row.
//   • `useLiveTVFavoriteActions` — the WRITE side. It does NOT subscribe:
//     the row that acts already knows whether the channel is a favourite
//     (the heart on the row says so), and a row that subscribed would
//     re-render every row in the list whenever one favourite changed.
//
// The store itself (`src/state/liveFavoritesStore.ts`) holds the records;
// the `kind: 'tv'` marker is what separates a saved channel from a saved
// radio station, and it is written here and nowhere else.

import {useCallback, useMemo} from 'react';
import {useLiveFavoritesStore, type LiveFavoriteItem} from '../../../state';
import type {ChannelRow} from '../related/channelRow';

export interface LiveTVFavoritesState {
  /** The saved channels. */
  favorites: LiveFavoriteItem[];
  /** Is this channel one of the saved ones? */
  isFavoriteId: (id: string) => boolean;
}

export function useLiveTVFavorites(): LiveTVFavoritesState {
  // Select the STABLE array and derive outside the selector. Filtering
  // inside the selector built a NEW array on every call, so zustand's
  // `Object.is` comparison never matched and the store drove an unbounded
  // re-render loop ("Maximum update depth exceeded").
  const items = useLiveFavoritesStore(s => s.items);
  const favorites = useMemo(() => items.filter(f => f.kind === 'tv'), [items]);
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(favorite => favorite.id === id),
    [favorites],
  );

  return {favorites, isFavoriteId};
}

/**
 * The write side of the saved channels.
 *
 * It writes through the store's own actions (`getState()`), so it never
 * holds a second copy of the records.
 */
export function useLiveTVFavoriteActions() {
  const addFavorite = useCallback((row: ChannelRow) => {
    useLiveFavoritesStore.getState().addLiveFavorite({
      kind: 'tv',
      id: row.id,
      name: row.name,
      url: row.url,
      image: row.image || '',
      subtitle: row.subtitle,
      ...(row.headers ? {headers: row.headers} : {}),
      addedAt: new Date().toISOString(),
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    useLiveFavoritesStore.getState().removeLiveFavorite({kind: 'tv', id});
  }, []);

  return {addFavorite, removeFavorite};
}
