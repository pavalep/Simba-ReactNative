// ─── Pre-built Podcast Categories ───────────────────────────────────────
// Maps to Podcast Index categories. No user typing needed.
// The 'all' entry is a synthetic first tile — the hook detects it and
// routes the call to /podcasts/trending (Podcast Index has no "browse
// everything" endpoint, but trending is a good universal default).
// P53: each entry also carries a local `image` cover for the Home rail.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

export interface PodcastCategory {
  id: number | 'all';
  name: string;
  icon: string;
  /** Local cover image for the Home rail tile. */
  image: ImageSourcePropType;
}

export const PODCAST_CATEGORIES: PodcastCategory[] = [
  // v9: sensible per-genre glyphs (Lucide) on the Home rail tiles.
  {id: 'all', name: 'All',        icon: 'micVocal',    image: CATEGORY_COVERS.podcasts.all},
  {id: 1,    name: 'Arts',       icon: 'palette',     image: CATEGORY_COVERS.podcasts.arts},
  {id: 10,   name: 'Music',      icon: 'disc3',       image: CATEGORY_COVERS.podcasts.music},
  {id: 15,   name: 'Business',   icon: 'briefcase',   image: CATEGORY_COVERS.podcasts.business},
  {id: 20,   name: 'Comedy',     icon: 'smile',       image: CATEGORY_COVERS.podcasts.comedy},
  {id: 25,   name: 'Education',  icon: 'graduationCap', image: CATEGORY_COVERS.podcasts.education},
  {id: 29,   name: 'Health',     icon: 'heartPulse',  image: CATEGORY_COVERS.podcasts.health},
  {id: 30,   name: 'Technology', icon: 'cpu',         image: CATEGORY_COVERS.podcasts.technology},
  {id: 33,   name: 'History',    icon: 'history',     image: CATEGORY_COVERS.podcasts.history},
  {id: 35,   name: 'News',       icon: 'newspaper',   image: CATEGORY_COVERS.podcasts.news},
  {id: 49,   name: 'Science',    icon: 'flaskConical', image: CATEGORY_COVERS.podcasts.science},
  {id: 55,   name: 'Sports',     icon: 'trophy',      image: CATEGORY_COVERS.podcasts.sports},
  {id: 60,   name: 'TV & Film',  icon: 'tv',          image: CATEGORY_COVERS.podcasts.tvFilm},
];
