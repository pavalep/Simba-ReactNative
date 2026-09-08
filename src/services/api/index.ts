// ─── Barrel Export — V18 ──────────────────────────────────────────────
// Re-exports the public service functions + domain types from
// the V18 adapters. The pre-V18 `*Service.ts` files were deleted
// in V18.3.4 (their only remaining consumer, useAggregatedSearch,
// was updated to import from the adapters directly).
//
// Convertors are NOT re-exported here — they collide across
// services (audius + jamendo both have `trackResultFromRaw`).
// Consumers that need convertors should import from the
// adapter directly.
//
// Where a service name has a collision across adapters
// (e.g. searchArtists vs searchShows), the V18 barrel renames
// the export so callers can disambiguate.

export * from './apiClient';

export {
  searchShows,
  getPopularShows,
  getShowById,
  getEpisodeList,
  getSchedule,
  type TVMazeShow,
  type TVMazeEpisode,
} from './tvmazeAdapter';

export {
  searchArtists as searchMusicBrainzArtists,
  getArtistDiscography,
  getReleaseGroupDetail,
  getCoverArt,
  type MusicBrainzArtist,
  type MusicBrainzRelease,
  type MusicBrainzReleaseGroupDetail,
  type MusicBrainzRecording,
} from './musicbrainzAdapter';

export * from './radioBrowserAdapter';

export {
  searchAudiobooks,
  getAudiobookById,
  searchByAuthor,
  searchByGenre,
  getRecentAudiobooks,
  type AudiobookResult,
} from './librivoxAdapter';

export * from './iptvAdapter';

export {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
  getJamendoTrackById,
  type JamendoTrackResult,
} from './jamendoAdapter';

export * from './internetArchiveAdapter';

export {
  searchAudiusTracks,
  getTrendingAudiusTracks,
  getAudiusTrackById,
  type AudiusTrackResult,
} from './audiusAdapter';
