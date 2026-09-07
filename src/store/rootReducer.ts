import {combineReducers} from '@reduxjs/toolkit';
import downloadsReducer from './slices/downloadsSlice';

const rootReducer = combineReducers({
  downloads: downloadsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
