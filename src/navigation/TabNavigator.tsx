import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabParamList} from './types';
import {HomeStack} from './HomeStack';
import {LibraryStack} from './LibraryStack';

/**
 * v11 Wave 1: authenticated shell without a persistent bottom tab bar.
 *
 * The nested route names are intentionally preserved for compatibility with
 * existing deep links and navigation calls. This is now a native stack, not a
 * bottom-tab navigator; Settings will become the deliberate secondary
 * navigation hub in the next wave.
 */
const MainShell = createNativeStackNavigator<TabParamList>();

export const MainShellNavigator: React.FC = () => (
  <MainShell.Navigator
    initialRouteName="HomeTab"
    screenOptions={{headerShown: false}}>
    <MainShell.Screen name="HomeTab" component={HomeStack} />
    <MainShell.Screen name="LibraryTab" component={LibraryStack} />
  </MainShell.Navigator>
);

/**
 * Compatibility export for existing RootNavigator imports. The name is kept
 * temporarily so the route contract does not change during the shell refactor.
 */
export const TabNavigator = MainShellNavigator;
