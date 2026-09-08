// V18: deprecated re-export shim. See ./audiusService for the
// rationale on why convertors are NOT re-exported here.
export {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
  getJamendoTrackById,
  type JamendoTrackResult,
} from './jamendoAdapter';
