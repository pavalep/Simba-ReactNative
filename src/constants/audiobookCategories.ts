// ─── Audiobook & Archive Browse Constants ─────────────────────────────
// Phase 37: LibriVox genres for the audiobook browse shelf + quick-search
// presets for the Internet Archive screen. These are real LibriVox genres
// and real archive.org queries (no fake data).

export const LIBRIVOX_GENRES = [
  'Adventure',
  'Children',
  'Comedy',
  'Drama',
  'Fairy tales',
  'Fantasy',
  'Fiction',
  'Historical',
  'History',
  'Horror',
  'Mystery',
  'Non-fiction',
  'Poetry',
  'Romance',
  'Science',
  'Science Fiction',
  'Short works',
  'Thriller',
  'Travel',
  'Western',
] as const;

/** Home shelf entries for the Audiobooks section (P37.7). */
export interface AudiobooksBrowseEntry {
  id: 'search' | 'genres' | 'recent';
  name: string;
  description: string;
  icon: string;
}

export const AUDIOBOOKS_BROWSE: AudiobooksBrowseEntry[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Find any public-domain book',
    icon: 'search',
  },
  {
    id: 'genres',
    name: 'Genres',
    description: 'Adventure, Mystery, Sci-Fi…',
    icon: 'layoutGrid',
  },
  {
    id: 'recent',
    name: 'New Releases',
    description: 'Recently recorded works',
    icon: 'music',
  },
];

/** Quick-search presets for the Internet Archive screen (P37.4). */
export interface ArchiveQuickSearch {
  id: string;
  label: string;
  icon: string;
  query: string;
}

export const ARCHIVE_QUICK_SEARCHES: ArchiveQuickSearch[] = [
  {
    id: 'oldtimeradio',
    label: 'Old Time Radio',
    icon: 'headphones',
    query: 'old time radio',
  },
  {
    id: 'concerts',
    label: 'Live Concerts',
    icon: 'music',
    query: 'live concerts',
  },
  {
    id: 'speeches',
    label: 'Speeches',
    icon: 'volume',
    query: 'speeches',
  },
  {
    id: 'classical',
    label: 'Classical',
    icon: 'music',
    query: 'classical music',
  },
];

/** Home shelf entries for the Archive section (P37.7). */
export interface ArchiveBrowseEntry {
  id: 'audio' | 'video';
  name: string;
  description: string;
  icon: string;
}

export const ARCHIVE_BROWSE: ArchiveBrowseEntry[] = [
  {
    id: 'audio',
    name: 'Audio',
    description: 'Radio, concerts, speeches',
    icon: 'headphones',
  },
  {
    id: 'video',
    name: 'Video',
    description: 'Films & documentaries',
    icon: 'video',
  },
];
