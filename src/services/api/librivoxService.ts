// V18: deprecated re-export shim. See ./audiusService for the
// rationale on why convertors are NOT re-exported here.
export {
  searchAudiobooks,
  getAudiobookById,
  searchByAuthor,
  searchByGenre,
  getRecentAudiobooks,
  type AudiobookResult,
} from './librivoxAdapter';
