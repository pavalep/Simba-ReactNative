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

/** Browse modes for the AudiobooksScreen tab bar (NOT the Home rail). */
export interface AudiobooksBrowseEntry {
  id: 'search' | 'genres' | 'recent' | 'all';
  name: string;
  description: string;
  icon: string;
}

export const AUDIOBOOKS_BROWSE: AudiobooksBrowseEntry[] = [
  {id: 'search', name: 'Search', description: 'Find any public-domain book', icon: 'search'},
  {id: 'genres', name: 'Genres', description: 'Adventure, Mystery, Sci-Fi…', icon: 'layoutGrid'},
  {id: 'recent', name: 'New Releases', description: 'Recently recorded works', icon: 'music'},
  {id: 'all', name: 'All', description: 'Every audiobook in one place', icon: 'layoutGrid'},
];

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
  {id: 'all',       name: 'All',         icon: 'layoutGrid', tag: '',                 description: 'Every audiobook in one place', image: CATEGORY_COVERS.audiobooks.all},
  {id: 'fiction',   name: 'Fiction',     icon: 'listMusic',  tag: 'fiction',          description: 'Classic and modern fiction',   image: CATEGORY_COVERS.audiobooks.fiction},
  {id: 'mystery',   name: 'Mystery',     icon: 'search',     tag: 'mystery',          description: 'Crime, detective, suspense',    image: CATEGORY_COVERS.audiobooks.mystery},
  {id: 'romance',   name: 'Romance',     icon: 'listMusic',  tag: 'romance',          description: 'Love stories and romance',      image: CATEGORY_COVERS.audiobooks.romance},
  {id: 'scifi',     name: 'Sci-Fi',      icon: 'speed',      tag: 'science fiction',  description: 'Science fiction and fantasy',   image: CATEGORY_COVERS.audiobooks.sciFi},
  {id: 'history',   name: 'History',     icon: 'video',      tag: 'history',          description: 'Historical accounts and memoirs', image: CATEGORY_COVERS.audiobooks.history},
  {id: 'poetry',    name: 'Poetry',      icon: 'music',      tag: 'poetry',           description: 'Classic and modern poetry',     image: CATEGORY_COVERS.audiobooks.poetry},
  {id: 'adventure', name: 'Adventure',   icon: 'speed',      tag: 'adventure',        description: 'Action, exploration, travel',   image: CATEGORY_COVERS.audiobooks.adventure},
];

/** Quick-search presets for the Internet Archive screen. */
export interface ArchiveQuickSearch {
  id: string;
  label: string;
  icon: string;
  query: string;
}

export const ARCHIVE_QUICK_SEARCHES: ArchiveQuickSearch[] = [
  {id: 'oldtimeradio', label: 'Old Time Radio', icon: 'headphones', query: 'old time radio'},
  {id: 'concerts',     label: 'Live Concerts',  icon: 'music',      query: 'live concerts'},
  {id: 'speeches',     label: 'Speeches',       icon: 'volume',     query: 'speeches'},
  {id: 'classical',    label: 'Classical',      icon: 'music',      query: 'classical music'},
];

/** Browse modes for the ArchiveScreen tab bar (NOT the Home rail). */
export interface ArchiveBrowseEntry {
  id: 'audio' | 'video' | 'all';
  name: string;
  description: string;
  icon: string;
}

export const ARCHIVE_BROWSE: ArchiveBrowseEntry[] = [
  {id: 'audio', name: 'Audio', description: 'Radio, concerts, speeches', icon: 'headphones'},
  {id: 'video', name: 'Video', description: 'Films & documentaries', icon: 'video'},
  {id: 'all', name: 'All', description: 'Every archive item', icon: 'layoutGrid'},
];

// ─── P53: Archive Home rail — uniform "All + content cards" ────────────
export interface ArchiveCategory {
  id: string;
  name: string;
  icon: string;
  query: string;
  description: string;
  image: ImageSourcePropType;
}

export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [
  {id: 'all',        name: 'All',            icon: 'layoutGrid', query: 'mediatype:(audio OR movies)', description: 'Every archive item', image: CATEGORY_COVERS.archive.all},
  {id: 'audio',      name: 'Audio',          icon: 'headphones', query: 'mediatype:(audio)',            description: 'Audio archive (radio, music, speeches)', image: CATEGORY_COVERS.archive.audio},
  {id: 'video',      name: 'Video',          icon: 'video',      query: 'mediatype:(movies)',           description: 'Films & documentaries', image: CATEGORY_COVERS.archive.video},
  {id: 'oldtime',    name: 'Old Time Radio', icon: 'volume',     query: 'mediatype:(audio) AND subject:("old time radio")', description: 'Vintage radio shows', image: CATEGORY_COVERS.archive.oldTime},
  {id: 'concerts',   name: 'Concerts',       icon: 'music',      query: 'mediatype:(audio) AND subject:("live concerts")', description: 'Live concert recordings', image: CATEGORY_COVERS.archive.concerts},
  {id: 'speeches',   name: 'Speeches',       icon: 'volume',     query: 'mediatype:(audio) AND subject:(speeches)',        description: 'Famous speeches and lectures', image: CATEGORY_COVERS.archive.speeches},
  {id: 'news',       name: 'News',           icon: 'bell',       query: 'mediatype:(audio) AND subject:(news)',           description: 'News reports and broadcasts', image: CATEGORY_COVERS.archive.news},
  {id: 'audiobooks', name: 'Audiobooks',     icon: 'bookmark',   query: 'mediatype:(audio) AND subject:(audiobooks)',     description: 'Spoken-word audiobooks', image: CATEGORY_COVERS.archive.audiobooks},
];
