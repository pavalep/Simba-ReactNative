import {combineReducers} from '@reduxjs/toolkit';
import playerReducer from './slices/playerSlice';
import playlistReducer from '../features/playlists/playlistReducer';
import downloadsReducer from './slices/downloadsSlice';
import recentHistoryReducer from '../features/recentHistory/recentHistoryReducer';

const rootReducer = combineReducers({
  player: playerReducer,
  playlists: playlistReducer,
  downloads: downloadsReducer,
  recentHistory: recentHistoryReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
