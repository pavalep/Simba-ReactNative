// ─── Radio Screen Hook ───────────────────────────────────────────────
// The ONE data hook of the Radio browse screen.
//
// It is the screen's whole data surface in two parts:
//
//   • `useRadioBrowser(scope)` — the station list for the scope (the
//     radio-browser adapter's own query);
//   • the FAVOURITES — the stations the user saved, and the switch that
//     saves and removes one.
//
// Both are data the list and its row menu need, and both live behind
// ONE hook so the provider has one thing to call.
//
// The scope itself is NOT here: the shell owns the filter selections
// and the search term, and the provider owns the scope's state (see
// `components/RadioDataProvider.tsx`).

import {useCallback, useMemo} from 'react';
import {
  useRadioBrowser,
  EMPTY_RADIO_SCOPE,
  type RadioBrowseState,
  type RadioScope,
} from './useRadioBrowser';
import {useLiveFavoritesStore} from '../../../state';
import type {StationRow} from '../related/stationRow';

export {EMPTY_RADIO_SCOPE};
export type {RadioScope};

export interface UseRadioScreenResult extends RadioBrowseState {
  isSearchActive: boolean;
  /** Is this station saved? */
  isFavoriteId: (id: string) => boolean;
  /** Save the station, or remove it if it is already saved. */
  toggleFavorite: (row: StationRow) => void;
}

export function useRadioScreen(scope: RadioScope): UseRadioScreenResult {
  const browse = useRadioBrowser(scope);

  // ── Favorites ──
  // V23 W24 (2026-11-05) — select the stable array, derive outside the
  // selector. Filtering inside the selector built a NEW array on every
  // call, so zustand's `Object.is` comparison never matched and the
  // store drove an unbounded re-render loop ("Maximum update depth
  // exceeded").
  const allFavorites = useLiveFavoritesStore(s => s.items);
  const favorites = useMemo(
    () => allFavorites.filter(f => f.kind === 'radio'),
    [allFavorites],
  );
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );
  const toggleFavorite = useCallback(
    (row: StationRow) => {
      const existing = favorites.find(f => f.id === row.id);
      if (existing) {
        useLiveFavoritesStore.getState().removeLiveFavorite({
          kind: 'radio',
          id: row.id,
        });
        return;
      }
      useLiveFavoritesStore.getState().addLiveFavorite({
        kind: 'radio',
        id: row.id,
        name: row.name,
        url: row.url,
        image: row.image,
        // ONE rule for the subtitle — the same one the browse row uses.
        // It used to be built twice with two different rules, so the same
        // station read "Germany · pop,rock,news" in browse and
        // "Germany · pop" in favourites.
        subtitle: row.subtitle,
        // The codec and the bitrate were DROPPED on the way in, so the
        // favourites row showed no "MP3 · 128 kbps" for a station whose
        // browse row showed it — even though the store type carries both
        // and the card renders them.
        codec: row.codec,
        bitrate: row.bitrate,
        addedAt: new Date().toISOString(),
      });
    },
    [favorites],
  );

  return {
    ...browse,
    isSearchActive: scope.searchTerm.trim().length > 0,
    isFavoriteId,
    toggleFavorite,
  };
}
