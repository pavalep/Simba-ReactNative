import type {HomeSection} from '../types';

export function getHomeSectionKey(item: HomeSection): string {
  switch (item.type) {
    case 'SHELF':
      return `home:shelf:${item.title}`;
    case 'SUBSECTION_TITLE':
      return `home:subsection:${item.label}`;
    case 'GENRE':
      return 'home:genres';
    case 'PLAYLISTS':
      return 'home:playlists';
    case 'BOOKMARKS':
      return 'home:bookmarks';
    case 'FOLLOWED_PODCASTS':
      return 'home:followed-podcasts';
    case 'BROWSE_ALL':
      return 'home:browse-all';
    case 'GREETING':
      return 'home:greeting';
  }
}
