import {combineReducers} from '@reduxjs/toolkit';
import playerReducer from './slices/playerSlice';
import settingsReducer from './slices/settingsSlice';
import sessionReducer from './slices/sessionSlice';
import playlistReducer from './slices/playlistSlice';
import pipReducer from './slices/pipSlice';
import mediaReducer from './slices/mediaSlice';
import authReducer from './slices/authSlice';

const rootReducer = combineReducers({
  player: playerReducer,
  settings: settingsReducer,
  session: sessionReducer,
  playlists: playlistReducer,
  pip: pipReducer,
  media: mediaReducer,
  auth: authReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
