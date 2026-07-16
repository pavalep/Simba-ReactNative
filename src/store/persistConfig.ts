import AsyncStorage from '@react-native-async-storage/async-storage';
import {PersistConfig} from 'redux-persist';
import rootReducer from './rootReducer';

export const persistConfig: PersistConfig<ReturnType<typeof rootReducer>> = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'session', 'player'],
  timeout: 0, // Disable rehydration timeout (default 5000ms can fail on slow emulators)
};
