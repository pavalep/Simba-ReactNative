// ─── TV Shows Browse Constants ─────────────────────────────────────────
// Phase 38 + P53: uniform "All + content cards" Home rail plus the
// separate browse-modes that drive the ShowsScreen tab bar.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

/** Browse modes for the ShowsScreen tab bar (NOT the Home rail). */
export interface ShowsBrowseEntry {
  id: 'search' | 'today' | 'browse' | 'all';
  name: string;
  description: string;
  icon: string;
}

export const SHOWS_BROWSE: ShowsBrowseEntry[] = [
  {id: 'search', name: 'Search',   description: 'Find any TV show',         icon: 'search'},
  {id: 'today',  name: 'On Today', description: 'What airs right now',     icon: 'bell'},
  {id: 'browse', name: 'Popular',  description: 'Browse the TVMaze catalog', icon: 'layoutGrid'},
  {id: 'all',    name: 'All',      description: 'Every show in the catalog', icon: 'layoutGrid'},
];

// ─── P53: Shows Home rail — uniform "All + content cards" ──────────────
export interface ShowCategory {
  id: string;
  name: string;
  icon: string;
  genre: string;
  description: string;
  image: ImageSourcePropType;
}

export const SHOW_CATEGORIES: ShowCategory[] = [
  // v9: sensible per-genre glyphs (Lucide) on the Home rail tiles.
  {id: 'all',         name: 'All',         icon: 'tv',         genre: '',                description: 'Every show in the catalog', image: CATEGORY_COVERS.shows.all},
  {id: 'drama',       name: 'Drama',       icon: 'drama',      genre: 'Drama',           description: 'Drama series', image: CATEGORY_COVERS.shows.drama},
  {id: 'comedy',      name: 'Comedy',      icon: 'smile',      genre: 'Comedy',          description: 'Sitcoms and comedy shows', image: CATEGORY_COVERS.shows.comedy},
  {id: 'action',      name: 'Action',      icon: 'flame',      genre: 'Action',          description: 'High-octane action series', image: CATEGORY_COVERS.shows.action},
  {id: 'scifi',       name: 'Sci-Fi',      icon: 'rocket',     genre: 'Science-Fiction', description: 'Science fiction shows', image: CATEGORY_COVERS.shows.sciFi},
  {id: 'mystery',     name: 'Mystery',     icon: 'search',     genre: 'Mystery',         description: 'Crime, mystery, whodunit', image: CATEGORY_COVERS.shows.mystery},
  {id: 'thriller',    name: 'Thriller',    icon: 'zap',        genre: 'Thriller',        description: 'Suspense and thriller shows', image: CATEGORY_COVERS.shows.thriller},
  {id: 'romance',     name: 'Romance',     icon: 'heart',      genre: 'Romance',         description: 'Romance and relationship dramas', image: CATEGORY_COVERS.shows.romance},
  {id: 'fantasy',     name: 'Fantasy',     icon: 'wand',       genre: 'Fantasy',         description: 'Fantasy worlds and magic', image: CATEGORY_COVERS.shows.fantasy},
  {id: 'documentary', name: 'Documentary', icon: 'camera',     genre: 'Documentary',     description: 'Documentary series', image: CATEGORY_COVERS.shows.documentary},
];
