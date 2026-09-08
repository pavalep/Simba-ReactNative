import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedAsyncStorage, CURRENT_PERSIST_VERSION} from './persistence';

/**
 * V17 Phase 79: replaces `liveFavoritesSlice` (Redux) with
 * `useLiveFavoritesStore` (Zustand + persist). State shape +
 * action semantics + persist key (`'liveFavorites'`) are
 * preserved.
 */

export interface LiveFavoriteItem {
  kind: 'radio' | 'tv';
  /** Per-station / per-channel id (`RadioStationResult.id` or `IPTVChannelResult.id`) */
  id: string;
  name: string;
  /** Playable stream URL */
  url: string;
  /** Station / channel image URL — may be empty */
  image: string;
  /** One-line context, e.g. "Germany · pop" or "News · US" */
  subtitle: string;
  codec?: string;
  bitrate?: number;
  addedAt: string; // ISO date string
}

export interface LiveFavoritesState {
  items: LiveFavoriteItem[];
}

export interface LiveFavoritesActions {
  addLiveFavorite: (item: LiveFavoriteItem) => void;
  removeLiveFavorite: (input: {kind: 'radio' | 'tv'; id: string}) => void;
  setLiveFavorites: (items: LiveFavoriteItem[]) => void;
  reset: () => void;
}

const initialState: LiveFavoritesState = {
  items: [],
};

export const useLiveFavoritesStore = create<LiveFavoritesState & LiveFavoritesActions>()(
  persist(
    (set) => ({
      ...initialState,
      addLiveFavorite: (item) =>
        set((s) => {
          if (s.items.some((i) => i.kind === item.kind && i.id === item.id)) {
            return s;
          }
          return {items: [item, ...s.items]};
        }),
      removeLiveFavorite: ({kind, id}) =>
        set((s) => ({
          items: s.items.filter((i) => !(i.kind === kind && i.id === id)),
        })),
      setLiveFavorites: (items) => set({items}),
      reset: () => set({...initialState}),
    }),
    {
      name: 'liveFavorites',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedAsyncStorage),
    },
  ),
);
