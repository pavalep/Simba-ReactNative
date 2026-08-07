import {configureStore} from '@reduxjs/toolkit';
import {persistReducer, persistStore} from 'redux-persist';
import {useDispatch, useSelector, TypedUseSelectorHook} from 'react-redux';
import {createLogger} from 'redux-logger';
import rootReducer from './rootReducer';
import {persistConfig} from './persistConfig';
import {mark} from '../utils/startupPerf';

const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Action logger. `__DEV__` gates the middleware so it never ships in
 * release builds. Collapsed output keeps logcat readable while still
 * surfacing every dispatched action + the state diff.
 *
 * The logger stays dormant while the app boots: redux-logger emits one
 * console group with full state snapshots per action, and during startup
 * (rehydration + first screen dispatches) that burst races the DevTools
 * inspector connection — on RN 0.86 the debugger then opens as a blank
 * window. It is switched on once the boot burst settles.
 */
let loggerEnabled = false;

const logger = createLogger({
  collapsed: true,
  duration: true,
  predicate: () => loggerEnabled,
  titleFormatter: (action, time, took) =>
    `🏷  ${action.type} (in ${time}${typeof took === 'number' ? `, took ${took.toFixed(2)}ms` : ''})`,
});

// 59.3: store constructed — after slice registration, before rehydration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(__DEV__ ? [logger] : []),
  devTools: __DEV__ && {
    name: 'SIMBA Store',
    // Don't surface persist internals in the action timeline — they
    // fire on every action and bury real user actions.
    actionsDenylist: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PURGE', 'persist/FLUSH', 'persist/REGISTER'],
  },
});
mark('store-ready');

export const persistor = persistStore(store);

// Arm the action logger only after rehydration completes, then let the
// remaining boot burst (initial screen dispatches) settle before the
// first action is printed — prevents the startup log flood from blanking
// the DevTools inspector connection on RN 0.86.
let settleTimer: ReturnType<typeof setTimeout> | undefined;

persistor.subscribe(() => {
  if (loggerEnabled || !persistor.getState().bootstrapped) {
    return;
  }
  settleTimer = setTimeout(() => {
    loggerEnabled = true;
  }, 1500);
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
