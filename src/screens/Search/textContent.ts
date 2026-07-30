/**
 * Search screen — query input, recent searches, filtered results with sort.
 */
const textContent = {
  title: 'Search',
  placeholder: 'Search videos, audio, artists, albums…',
  clearA11y: 'Clear search',
  searchA11y: 'Search',
  recent: 'Recent',
  filterAll: 'All',
  filterVideos: 'Videos',
  filterAudio: 'Audio',
  sortRelevance: 'Relevance',
  sortDate: 'Date',
  sortName: 'Name',
  groupRecent: 'Recent',
  groupArtists: 'Artists',
  groupAlbums: 'Albums',
  groupPlaylists: 'Playlists',
  groupVideos: 'Videos',
  groupAudio: 'Audio',
  groupFolders: 'Folders',
  emptyTitle: 'No results for "{query}"',
  emptyHint: 'Try a different search term or adjust filters.',
} as const;

export default textContent;
