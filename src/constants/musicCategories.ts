// ─── Pre-built Music Categories ─────────────────────────────────────────
// Pre-filled genre tabs for Jamendo / Audius discovery.
// 'all' is a synthetic first tile — the Home screen maps it to the
// MusicScreen Popular tab (a "browse everything trending" view).
// P53: each entry also carries a local `image` cover for the Home rail.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

export interface MusicCategory {
  id: string;
  name: string;
  icon: string;
  /** Passed as genre or tag to Jamendo/Audius. Empty string = no filter. */
  genre: string;
  /** Local cover image for the Home rail tile. */
  image: ImageSourcePropType;
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {id: 'all',        name: 'All',        icon: 'layoutGrid', genre: '',           image: CATEGORY_COVERS.music.all},
  {id: 'rock',       name: 'Rock',       icon: 'music',      genre: 'rock',       image: CATEGORY_COVERS.music.rock},
  {id: 'pop',        name: 'Pop',        icon: 'music',      genre: 'pop',        image: CATEGORY_COVERS.music.pop},
  {id: 'electronic', name: 'Electronic', icon: 'speed',      genre: 'electronic', image: CATEGORY_COVERS.music.electronic},
  {id: 'jazz',       name: 'Jazz',       icon: 'listMusic',  genre: 'jazz',       image: CATEGORY_COVERS.music.jazz},
  {id: 'classical',  name: 'Classical',  icon: 'search',     genre: 'classical',  image: CATEGORY_COVERS.music.classical},
  {id: 'hip-hop',    name: 'Hip-Hop',    icon: 'music',      genre: 'hip-hop',    image: CATEGORY_COVERS.music.hiphop},
  {id: 'ambient',    name: 'Ambient',    icon: 'camera',     genre: 'ambient',    image: CATEGORY_COVERS.music.ambient},
  {id: 'folk',       name: 'Folk',       icon: 'folder',     genre: 'folk',       image: CATEGORY_COVERS.music.folk},
  {id: 'blues',      name: 'Blues',      icon: 'sliders',    genre: 'blues',      image: CATEGORY_COVERS.music.blues},
  {id: 'reggae',     name: 'Reggae',     icon: 'video',      genre: 'reggae',     image: CATEGORY_COVERS.music.reggae},
];
