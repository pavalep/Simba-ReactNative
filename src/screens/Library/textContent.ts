/**
 * Library screen — segmented browsing of videos, audio, artists, albums, playlists.
 */
const textContent = {
  // ── Segment labels ──
  segmentVideos: 'Videos',
  segmentAudio: 'Audio',
  segmentArtists: 'Artists',
  segmentAlbums: 'Albums',
  segmentPlaylists: 'Playlists',

  // ── Filter chips ──
  filterAll: 'All',
  filterVideo: 'Video',
  filterAudio: 'Audio',

  // ── Sort options ──
  sortName: 'Name',
  sortDateAdded: 'Date Added',
  sortDuration: 'Duration',
  sortArtist: 'Artist',
  sortAlbum: 'Album',

  // ── Content modes ──
  contentModeSingular: 'item',
  contentModePlural: 'items',

  // ── Playlist filters (status) ──
  filterAllPlaylists: 'All',
  filterVideoPlaylists: 'Video',
  filterAudioPlaylists: 'Audio',

  // ── Empty states ──
  emptyVideos: 'No videos found.',
  emptyAudio: 'No audio files found.',
  emptyArtists: 'No artists found.',
  emptyAlbums: 'No albums found.',
  emptyPlaylists: 'No playlists yet.',

  // ── Header / labels ──
  headerMatching: 'Matching',
  headerSortBy: 'Sort by',
  headerContentMode: 'Display',

  // ── View toggle ──
  viewGrid: 'Grid',
  viewList: 'List',

  // ── Toast ──
  scanErrorToast: '{count} file(s) could not be scanned.',
} as const;

export default textContent;
