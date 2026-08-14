// ─── Pre-built Movie Categories ──────────────────────────────────────────
// Users browse these categories — no typing required.
// Each maps to a hardcoded Internet Archive advanced search query.
// P53: each entry also carries a local `image` cover for the Home rail.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

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
    query: 'mediatype:(movies)',
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
