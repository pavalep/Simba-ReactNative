// ─── Audiobook & Archive Browse Constants ─────────────────────────────
// Phase 37 + P53: uniform "All + content cards" Home rail plus the
// separate browse-modes that drive the Audiobooks/Archive tab bars.

import type {ImageSourcePropType} from 'react-native';
import {CATEGORY_COVERS} from '../assets/images/categories';

export const LIBRIVOX_GENRES = [
  'Adventure', 'Children', 'Comedy', 'Drama', 'Fairy tales', 'Fantasy',
  'Fiction', 'Historical', 'History', 'Horror', 'Mystery', 'Non-fiction',
  'Poetry', 'Romance', 'Science', 'Science Fiction', 'Short works',
  'Thriller', 'Travel', 'Western',
] as const;

// ─── P53: Audiobooks Home rail — uniform "All + content cards" ─────────
export interface AudiobookCategory {
  id: string;
  name: string;
  icon: string;
  /** LibriVox genre (lowercased). */
  tag: string;
  description: string;
  image: ImageSourcePropType;
}

export const AUDIOBOOK_CATEGORIES: AudiobookCategory[] = [
  // v9: sensible per-genre glyphs (Lucide) on the Home rail tiles.
  {id: 'all',       name: 'All',         icon: 'book',       tag: '',                 description: 'Every audiobook in one place', image: CATEGORY_COVERS.audiobooks.all},
  {id: 'fiction',   name: 'Fiction',     icon: 'bookOpen',   tag: 'fiction',          description: 'Classic and modern fiction',   image: CATEGORY_COVERS.audiobooks.fiction},
  {id: 'mystery',   name: 'Mystery',     icon: 'search',     tag: 'mystery',          description: 'Crime, detective, suspense',    image: CATEGORY_COVERS.audiobooks.mystery},
  {id: 'romance',   name: 'Romance',     icon: 'heart',      tag: 'romance',          description: 'Love stories and romance',      image: CATEGORY_COVERS.audiobooks.romance},
  {id: 'scifi',     name: 'Sci-Fi',      icon: 'rocket',     tag: 'science fiction',  description: 'Science fiction and fantasy',   image: CATEGORY_COVERS.audiobooks.sciFi},
  {id: 'history',   name: 'History',     icon: 'history',    tag: 'history',          description: 'Historical accounts and memoirs', image: CATEGORY_COVERS.audiobooks.history},
  {id: 'poetry',    name: 'Poetry',      icon: 'feather',    tag: 'poetry',           description: 'Classic and modern poetry',     image: CATEGORY_COVERS.audiobooks.poetry},
  {id: 'adventure', name: 'Adventure',   icon: 'compass',    tag: 'adventure',        description: 'Action, exploration, travel',   image: CATEGORY_COVERS.audiobooks.adventure},
];

