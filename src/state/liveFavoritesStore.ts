import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

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
  /**
   * The request headers the source declared for this stream, if any.
   *
   * Only a TV channel has them: the radio directories do not publish
   * per-stream request headers. A saved channel keeps them so it plays
   * the way the browser played it.
   */
  headers?: Record<string, string>;
  addedAt: string; // ISO date string
}

export interface LiveFavoritesState {
  items: LiveFavoriteItem[];
}

export interface LiveFavoritesActions {
  addLiveFavorite: (item: LiveFavoriteItem) => void;
  removeLiveFavorite: (input: {kind: 'radio' | 'tv'; id: string}) => void;
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
      reset: () => set({...initialState}),
    }),
    {
      name: 'liveFavorites',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
