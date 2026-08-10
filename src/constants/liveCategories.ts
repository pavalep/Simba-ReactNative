// ─── Live Categories ─────────────────────────────────────────
// Phase 36.7 + P53: Home shelf entries for Live Radio and
// Live TV. Browse modes (Top / Genres list / …) live in
// `RADIO_BROWSE`/`SHOWS_BROWSE` and power the screen tab bars.
// The Home rails consume `RADIO_CATEGORIES` and `IPTV_CATEGORIES`
// (the uniform "All + content cards" pattern).

export interface RadioBrowseEntry {
  id: 'top' | 'genres' | 'countries' | 'languages' | 'favorites' | 'all';
  name: string;
  description: string;
  icon: string;
}

export const RADIO_BROWSE: RadioBrowseEntry[] = [
  {id: 'top', name: 'Top Stations', description: 'Most-clicked stations right now', icon: 'music'},
  {id: 'genres', name: 'By Genre', description: 'Pop, rock, jazz and more', icon: 'sliders'},
  {id: 'countries', name: 'By Country', description: 'Stations from around the world', icon: 'layoutGrid'},
  {id: 'languages', name: 'By Language', description: 'Tune in by language', icon: 'subtitles'},
  {id: 'favorites', name: 'Favorites', description: 'Stations you saved', icon: 'bookmark'},
  {id: 'all', name: 'All', description: 'Browse every station', icon: 'layoutGrid'},
];

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

export interface RadioCategory {
  id: string;
  name: string;
  icon: string;
  /** Radio-Browser tag (lowercase, multi-word allowed). */
  tag: string;
  description: string;
  image: ImageSourcePropType;
}

export const RADIO_CATEGORIES: RadioCategory[] = [
  {id: 'all',       name: 'All',         icon: 'layoutGrid', tag: '',           description: 'Top stations right now',         image: CATEGORY_COVERS.radio.all},
  {id: 'pop',       name: 'Pop',         icon: 'music',      tag: 'pop',       description: 'Pop hits from around the world', image: CATEGORY_COVERS.radio.pop},
  {id: 'rock',      name: 'Rock',        icon: 'music',      tag: 'rock',      description: 'Classic and modern rock',        image: CATEGORY_COVERS.radio.rock},
  {id: 'jazz',      name: 'Jazz',        icon: 'listMusic',  tag: 'jazz',      description: 'Smooth jazz, bebop, fusion',     image: CATEGORY_COVERS.radio.jazz},
  {id: 'classical', name: 'Classical',   icon: 'listMusic',  tag: 'classical', description: 'Symphonies, chamber, opera',     image: CATEGORY_COVERS.radio.classical},
  {id: 'news',      name: 'News',        icon: 'bell',       tag: 'news',      description: 'Live news from around the globe',image: CATEGORY_COVERS.radio.news},
  {id: 'talk',      name: 'Talk',        icon: 'volume',     tag: 'talk',      description: 'Talk radio and interviews',      image: CATEGORY_COVERS.radio.talk},
  {id: 'hip-hop',   name: 'Hip-Hop',     icon: 'music',      tag: 'hip-hop',   description: 'Hip-hop, rap, R&B',              image: CATEGORY_COVERS.radio.hiphop},
  {id: 'electronic',name: 'Electronic',  icon: 'speed',      tag: 'electronic',description: 'House, techno, EDM',              image: CATEGORY_COVERS.radio.electronic},
  {id: 'country',   name: 'Country',     icon: 'music',      tag: 'country',   description: 'Country, Americana, folk',       image: CATEGORY_COVERS.radio.country},
];

export interface IPTVBrowseEntry {
  id: string;
  name: string;
  icon: string;
  image: ImageSourcePropType;
}

/** Well-known iptv-org category ids (channels fetched live). */
export const IPTV_CATEGORIES: IPTVBrowseEntry[] = [
  {id: 'all',          name: 'All',          icon: 'layoutGrid', image: CATEGORY_COVERS.liveTv.all},
  {id: 'news',         name: 'News',         icon: 'bell',       image: CATEGORY_COVERS.liveTv.news},
  {id: 'sports',       name: 'Sports',       icon: 'play',       image: CATEGORY_COVERS.liveTv.sports},
  {id: 'music',        name: 'Music',        icon: 'music',      image: CATEGORY_COVERS.liveTv.music},
  {id: 'movies',       name: 'Movies',       icon: 'video',      image: CATEGORY_COVERS.liveTv.movies},
  {id: 'documentary',  name: 'Documentary',  icon: 'camera',     image: CATEGORY_COVERS.liveTv.documentary},
  {id: 'kids',         name: 'Kids',         icon: 'lion',       image: CATEGORY_COVERS.liveTv.kids},
  {id: 'entertainment',name: 'Entertainment',icon: 'list',       image: CATEGORY_COVERS.liveTv.entertainment},
];
