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
  /** Optional IA sort applied to the search (e.g. "downloads desc"). */
  sort?: string;
}

export const MOVIE_CATEGORIES: MovieCategory[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'clapperboard',
    query: 'mediatype:(movies) AND subject:("Feature Films")',
    sort: 'downloads desc',
    description: 'Every movie in the archive, most popular first',
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
