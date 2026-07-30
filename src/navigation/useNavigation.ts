import {
  useNavigation as useBaseNavigation,
  useRoute as useBaseRoute,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from './types';

/**
 * Typed `useNavigation` for the root stack.
 * Returns a fully typed navigation prop so navigate(), goBack(), push(),
 * reset(), etc. are checked against RootStackParamList.
 */
export function useNavigation() {
  return useBaseNavigation<NativeStackNavigationProp<RootStackParamList>>();
}

/**
 * Typed `useRoute` for the root stack.
 * Returns a route prop whose `params` are typed per the current screen.
 */
export function useRoute<T extends keyof RootStackParamList>() {
  return useBaseRoute<RouteProp<RootStackParamList, T>>();
}
