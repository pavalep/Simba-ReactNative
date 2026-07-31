import {configureStore} from '@reduxjs/toolkit';
import {persistReducer, persistStore} from 'redux-persist';
import {useDispatch, useSelector, TypedUseSelectorHook} from 'react-redux';
import rootReducer from './rootReducer';
import {persistConfig} from './persistConfig';
import {mark} from '../utils/startupPerf';

const persistedReducer = persistReducer(persistConfig, rootReducer);

// 59.3: store constructed — after slice registration, before rehydration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});
mark('store-ready');

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
