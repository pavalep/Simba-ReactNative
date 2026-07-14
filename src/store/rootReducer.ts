import {combineReducers} from '@reduxjs/toolkit';
import playerReducer from './slices/playerSlice';
import settingsReducer from './slices/settingsSlice';
import sessionReducer from './slices/sessionSlice';

const rootReducer = combineReducers({
  player: playerReducer,
  settings: settingsReducer,
  session: sessionReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
