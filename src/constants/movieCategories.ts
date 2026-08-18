// ─── Pre-built Movie Categories ─────────────────────────────────────────
// Users browse these categories — no typing required.
// Each maps to a hardcoded Internet Archive advanced search query.
// P53: each entry also carries a local `image` cover for the Home rail.
//
// v10.1b: each query gets a JUNK_FILTER appended to strip CapCut
// templates, test uploads, screener dumps, etc. The default IA
// mediatype:(movies) bucket mixes real feature films with raw TV
// uploads and user-generated content; tightening at the IA server
// is the cheapest place to drop the noise (no client-side
// filtering, no UI thrash).

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

/**
 * Applied to every category — strips junk IA uploads that match the
 * mediatype but are clearly not real movies (test files, templates,
 * screeners, music videos, home video dumps).
 */
const JUNK_FILTER =
  ' NOT title:(test* OR template* OR sample* OR screener* OR trailer* OR ' +
  'short OR clip OR promo OR live* OR podcast* OR episode* OR concert*) ' +
  'AND NOT collection:(test_collection OR opensource_movies OR ' +
  'community_video OR stockfootage OR home_movies OR musicvideos)';

export interface MovieCategory {
  id: string;
  name: string;
  icon: string;
  query: string;
  description: string;
  /** Local cover image for the Home rail tile. */
  image: ImageSourcePropType;
}

export const MOVIE_CATEGORIES: MovieCategory[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'clapperboard',
    // Positive `collection:` allowlist — filter by IA's curated movie
    // collection IDs instead of a brittle title denylist. Junk (music
    // videos, home movies, trailers, TV dumps) lives in OTHER collections,
    // so it never enters this stream. Default is also unsorted — no
    // `sort[]` is sent, so IA returns its natural order. Sorting is
    // opt-in via the FAB sheet (sortParamFor).
    query: 'collection:(feature_films OR silent_films OR short_films)',
    description: 'Every movie in the archive',
    image: CATEGORY_COVERS.movies.all,
  },
  {
    id: 'classic-films',
    name: 'Classic Films',
    icon: 'award',
    query: 'subject:"classic films" AND mediatype:movies',
    description: 'Timeless cinema from the golden age',
    image: CATEGORY_COVERS.movies.classicFilms,
  },
  {
    id: 'public-domain',
    name: 'Public Domain',
    icon: 'unlock',
    query: 'subject:"public domain" AND mediatype:movies',
    description: 'Free movies you can watch anytime',
    image: CATEGORY_COVERS.movies.publicDomain,
  },
  {
    id: 'documentaries',
    name: 'Documentaries',
    icon: 'camera',
    query: 'subject:documentary AND mediatype:movies',
    description: 'Explore the world through film',
    image: CATEGORY_COVERS.movies.documentary,
  },
  {
    id: 'silent-films',
    name: 'Silent Films',
    icon: 'drama',
    query: 'subject:"silent films" AND mediatype:movies',
    description: 'The birth of cinema',
    image: CATEGORY_COVERS.movies.silentFilms,
  },
  {
    id: 'comedy',
    name: 'Comedy',
    icon: 'smile',
    query: 'subject:comedy AND mediatype:movies',
    description: 'Classic laughs from every era',
    image: CATEGORY_COVERS.movies.comedy,
  },
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    icon: 'rocket',
    query: 'subject:"science fiction" AND mediatype:movies',
    description: 'Vintage sci-fi adventures',
    image: CATEGORY_COVERS.movies.sciFi,
  },
  {
    id: 'western',
    name: 'Westerns',
    icon: 'sunset',
    query: 'subject:western AND mediatype:movies',
    description: 'Saddle up for classic westerns',
    image: CATEGORY_COVERS.movies.westerns,
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    icon: 'moon',
    query: 'subject:"film noir" AND mediatype:movies',
    description: 'Dark, stylish crime dramas',
    image: CATEGORY_COVERS.movies.filmNoir,
  },
  // v10.2b: genre categories the Movies shelf originally skipped — the
  // FILTER sheet collapses these behind "SHOW MORE" so the first six
  // categories stay instantly tappable. Cover images reuse existing
  // Movies assets as genre-mood fallbacks (no new binary assets needed).
  {
    id: 'animation',
    name: 'Animation',
    icon: 'wand',
    query: 'subject:animation AND mediatype:movies',
    description: 'Hand-drawn classics and animated features',
    image: CATEGORY_COVERS.movies.comedy,
  },
  {
    id: 'horror',
    name: 'Horror',
    icon: 'moon',
    query: 'subject:horror AND mediatype:movies',
    description: 'Spine-chilling vintage frights',
    image: CATEGORY_COVERS.movies.filmNoir,
  },
  {
    id: 'drama',
    name: 'Drama',
    icon: 'videoCamera',
    query: 'subject:drama AND mediatype:movies',
    description: 'Powerful stories from cinema',
    image: CATEGORY_COVERS.movies.classicFilms,
  },
  {
    id: 'action',
    name: 'Action',
    icon: 'zap',
    query: 'subject:action AND mediatype:movies',
    description: 'High-octane thrills and stunts',
    image: CATEGORY_COVERS.movies.westerns,
  },
  {
    id: 'war',
    name: 'War',
    icon: 'flame',
    query: 'subject:war AND mediatype:movies',
    description: 'Epic stories from history\u2019s great conflicts',
    image: CATEGORY_COVERS.movies.publicDomain,
  },
  {
    id: 'crime',
    name: 'Crime',
    icon: 'megaphone',
    query: 'subject:crime AND mediatype:movies',
    description: 'Gangsters, heists, and hard-boiled tales',
    image: CATEGORY_COVERS.movies.filmNoir,
  },
  {
    id: 'mystery',
    name: 'Mystery',
    icon: 'search',
    query: 'subject:mystery AND mediatype:movies',
    description: 'Whodunits and puzzling cases',
    image: CATEGORY_COVERS.movies.silentFilms,
  },
  {
    id: 'romance',
    name: 'Romance',
    icon: 'heart',
    query: 'subject:romance AND mediatype:movies',
    description: 'Love stories from every era',
    image: CATEGORY_COVERS.movies.classicFilms,
  },
  {
    id: 'musical',
    name: 'Musical',
    icon: 'micVocal',
    query: 'subject:musical AND mediatype:movies',
    description: 'Song-and-dance spectaculars',
    image: CATEGORY_COVERS.movies.comedy,
  },
  {
    id: 'adventure',
    name: 'Adventure',
    icon: 'compass',
    query: 'subject:adventure AND mediatype:movies',
    description: 'Daring quests and exotic journeys',
    image: CATEGORY_COVERS.movies.sciFi,
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    icon: 'sparkles',
    query: 'subject:fantasy AND mediatype:movies',
    description: 'Imaginary worlds and magical tales',
    image: CATEGORY_COVERS.movies.sciFi,
  },
  {
    id: 'thriller',
    name: 'Thriller',
    icon: 'heartPulse',
    query: 'subject:thriller AND mediatype:movies',
    description: 'Suspense-filled nail-biters',
    image: CATEGORY_COVERS.movies.filmNoir,
  },
];

/**
 * Append JUNK_FILTER to every category's query so the IA server
 * drops obvious non-movies at query time. Used by the hook's
 * `scopedQuery` builder — keeps category definitions short and
 * makes the noise filter explicit / one-line editable.
 */
export function withJunkFilter(query: string): string {
  // The category's own parens are kept; junk filter is ANDed to the
  // outer expression.
  return `(${query})${JUNK_FILTER}`;
}
