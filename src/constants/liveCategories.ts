// ─── Live Categories ─────────────────────────────────────────
// Phase 36.7: Home shelf browse entries for Live Radio and
// Live TV. Radio entries map to RadioScreen browse tabs; TV
// entries use real iptv-org category ids (channels are fetched
// live from the API — never fake data).

export interface RadioBrowseEntry {
  id: 'top' | 'genres' | 'countries' | 'languages' | 'favorites';
  name: string;
  description: string;
  icon: string;
}

export const RADIO_BROWSE: RadioBrowseEntry[] = [
  {
    id: 'top',
    name: 'Top Stations',
    description: 'Most-clicked stations right now',
    icon: 'music',
  },
  {
    id: 'genres',
    name: 'By Genre',
    description: 'Pop, rock, jazz and more',
    icon: 'sliders',
  },
  {
    id: 'countries',
    name: 'By Country',
    description: 'Stations from around the world',
    icon: 'layoutGrid',
  },
  {
    id: 'languages',
    name: 'By Language',
    description: 'Tune in by language',
    icon: 'subtitles',
  },
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Stations you saved',
    icon: 'bookmark',
  },
];

export interface IPTVBrowseEntry {
  id: string;
  name: string;
  icon: string;
}

/** Well-known iptv-org category ids (channels fetched live). */
export const IPTV_CATEGORIES: IPTVBrowseEntry[] = [
  {id: 'news', name: 'News', icon: 'bell'},
  {id: 'sports', name: 'Sports', icon: 'play'},
  {id: 'music', name: 'Music', icon: 'music'},
  {id: 'movies', name: 'Movies', icon: 'video'},
  {id: 'documentary', name: 'Documentary', icon: 'camera'},
  {id: 'kids', name: 'Kids', icon: 'lion'},
  {id: 'entertainment', name: 'Entertainment', icon: 'list'},
];
