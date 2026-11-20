// ─── Audiobook & Archive Browse Constants ─────────────────────────────
// Phase 37 + P53: uniform "All + content cards" Home rail plus the
// separate browse-modes that drive the Audiobooks/Archive tab bars.

import type {ImageSourcePropType} from 'react-native';

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


