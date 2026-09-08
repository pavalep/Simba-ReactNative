// V18: deprecated re-export shim. See ./audiusService for the
// rationale on why convertors are NOT re-exported here.
export {
  searchArtists,
  getArtistDiscography,
  getReleaseGroupDetail,
  getCoverArt,
  type MusicBrainzArtist,
  type MusicBrainzRelease,
  type MusicBrainzReleaseGroupDetail,
  type MusicBrainzRecording,
} from './musicbrainzAdapter';
