// V18: deprecated re-export shim. See ./audiusService for the
// rationale on why convertors are NOT re-exported here.
export {
  searchShows,
  getPopularShows,
  getShowById,
  getEpisodeList,
  getSchedule,
  type TVMazeShow,
  type TVMazeEpisode,
} from './tvmazeAdapter';
