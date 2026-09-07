import {combineReducers} from '@reduxjs/toolkit';
import playerReducer from './slices/playerSlice';
import downloadsReducer from './slices/downloadsSlice';

const rootReducer = combineReducers({
  player: playerReducer,
  downloads: downloadsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
