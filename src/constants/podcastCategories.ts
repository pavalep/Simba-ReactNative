// ─── Pre-built Podcast Categories ───────────────────────────────────────
// The app's CURATED genre set — the fixed shelf the Podcasts filter
// offers, with the app's own cover art and glyph per genre.
//
// The ids are Podcast Index's OWN category ids, corrected against the
// live `/categories/list` taxonomy (measured 2026-11-13, 112 items).
// Ten of the twelve ids this file used to carry pointed at a DIFFERENT
// genre than the label said — id 10 is Careers, not Music; id 55 is
// News, not Sports — so the app asked for one thing and showed
// another. `__tests__/constants/podcastCategories.test.ts` pins the
// mapping so it cannot rot again.
//
// The 'all' entry is a synthetic first tile — it routes the call to
// /podcasts/trending (Podcast Index has no "browse everything"
// endpoint, but trending is a good universal default).
//
// TV & Film is NOT here: Podcast Index splits it into TV (104) and
// Film (105), and the app ships no plate or glyph for either — a tile
// that cannot be drawn is a tile that does not ship.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

export interface PodcastCategory {
  id: number | 'all';
  name: string;
  icon: string;
  /**
   * Local cover plate for the genre.
   *
   * Optional on purpose: Science and Sports have no plate of their own
   * (the folder `assets/images/categories/podcasts/` has no file for
   * either), so they carry NO image and the shelf draws the app's own
   * `goldSoft` plate with the glyph badge on top — the Local Files
   * card's grammar. Pointing them at another genre's picture would be
   * a lie about the product.
   */
  image?: ImageSourcePropType;
}

export const PODCAST_CATEGORIES: PodcastCategory[] = [
  // v9: sensible per-genre glyphs (Lucide) on the Home rail tiles.
  {id: 'all',       name: 'All',        icon: 'micVocal',      image: CATEGORY_COVERS.podcasts.all},
  {id: 1,          name: 'Arts',       icon: 'palette',       image: CATEGORY_COVERS.podcasts.arts},
  {id: 53,         name: 'Music',      icon: 'disc3',         image: CATEGORY_COVERS.podcasts.music},
  {id: 9,          name: 'Business',   icon: 'briefcase',     image: CATEGORY_COVERS.podcasts.business},
  {id: 16,         name: 'Comedy',     icon: 'smile',         image: CATEGORY_COVERS.podcasts.comedy},
  {id: 20,         name: 'Education',  icon: 'graduationCap', image: CATEGORY_COVERS.podcasts.education},
  {id: 29,         name: 'Health',     icon: 'heartPulse',    image: CATEGORY_COVERS.podcasts.health},
  {id: 102,        name: 'Technology', icon: 'cpu',           image: CATEGORY_COVERS.podcasts.technology},
  {id: 28,         name: 'History',    icon: 'history',       image: CATEGORY_COVERS.podcasts.history},
  {id: 55,         name: 'News',       icon: 'newspaper',     image: CATEGORY_COVERS.podcasts.news},
  {id: 67,         name: 'Science',    icon: 'flaskConical'},
  {id: 86,         name: 'Sports',     icon: 'trophy'},
];
