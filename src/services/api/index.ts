// ─── Barrel Export — Phase 0 Content API Services ───────────────────────
// Import individual services as needed:
//   import { searchJamendoTracks } from '../services/api';
// or destructure the named exports.
//
// NOTE: Explicit re-exports are used where function names collide
// across services (e.g. searchArtists, searchPodcasts, searchAudiobooks).

export * from './apiClient';
export * from './tvmazeService';

export {
  searchArtists as searchMusicBrainzArtists,
  getArtistDiscography,
  getCoverArt,
} from './musicbrainzService';

export {
  searchPodcasts,
  getTrendingPodcasts,
  getEpisodes,
  getPodcastById,
} from './podcastIndexService';

export * from './radioBrowserService';

export {
  searchAudiobooks,
  getAudiobookById,
  searchByAuthor,
} from './librivoxService';

export * from './iptvService';
export * from './jamendoService';
export * from './internetArchiveService';
export * from './audiusService';
