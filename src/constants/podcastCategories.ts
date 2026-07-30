// ─── Pre-built Podcast Categories ───────────────────────────────────────
// Maps to Podcast Index categories. No user typing needed.

export interface PodcastCategory {
  id: number;
  name: string;
  icon: string;
}

export const PODCAST_CATEGORIES: PodcastCategory[] = [
  {id: 1, name: 'Arts', icon: 'music'},
  {id: 10, name: 'Music', icon: 'music'},
  {id: 15, name: 'Business', icon: 'folder'},
  {id: 20, name: 'Comedy', icon: 'listMusic'},
  {id: 25, name: 'Education', icon: 'search'},
  {id: 29, name: 'Health', icon: 'camera'},
  {id: 30, name: 'Technology', icon: 'speed'},
  {id: 33, name: 'History', icon: 'video'},
  {id: 35, name: 'News', icon: 'camera'},
  {id: 49, name: 'Science', icon: 'search'},
  {id: 55, name: 'Sports', icon: 'speed'},
  {id: 60, name: 'TV & Film', icon: 'video'},
];
