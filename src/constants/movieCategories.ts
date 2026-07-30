// ─── Pre-built Movie Categories ──────────────────────────────────────────
// Users browse these categories — no typing required.
// Each maps to a hardcoded Internet Archive advanced search query.

export interface MovieCategory {
  id: string;
  name: string;
  icon: string;
  query: string;
  description: string;
}

export const MOVIE_CATEGORIES: MovieCategory[] = [
  {
    id: 'classic-films',
    name: 'Classic Films',
    icon: 'video',
    query: 'subject:"classic films" AND mediatype:movies',
    description: 'Timeless cinema from the golden age',
  },
  {
    id: 'public-domain',
    name: 'Public Domain',
    icon: 'folder',
    query: 'subject:"public domain" AND mediatype:movies',
    description: 'Free movies you can watch anytime',
  },
  {
    id: 'documentaries',
    name: 'Documentaries',
    icon: 'camera',
    query: 'subject:documentary AND mediatype:movies',
    description: 'Explore the world through film',
  },
  {
    id: 'silent-films',
    name: 'Silent Films',
    icon: 'music',
    query: 'subject:"silent films" AND mediatype:movies',
    description: 'The birth of cinema',
  },
  {
    id: 'comedy',
    name: 'Comedy',
    icon: 'listMusic',
    query: 'subject:comedy AND mediatype:movies',
    description: 'Classic laughs from every era',
  },
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    icon: 'speed',
    query: 'subject:"science fiction" AND mediatype:movies',
    description: 'Vintage sci-fi adventures',
  },
  {
    id: 'western',
    name: 'Westerns',
    icon: 'search',
    query: 'subject:western AND mediatype:movies',
    description: 'Saddle up for classic westerns',
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    icon: 'sliders',
    query: 'subject:"film noir" AND mediatype:movies',
    description: 'Dark, stylish crime dramas',
  },
];
