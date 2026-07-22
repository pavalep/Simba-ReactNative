import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SettingsTabParamList} from './types';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';
import {AboutScreen} from '../screens/About/AboutScreen';
import {AudioSettingsScreen} from '../screens/AudioSettings/AudioSettingsScreen';
import {LinkedFoldersScreen} from '../screens/LinkedFolders/LinkedFoldersScreen';

const Stack = createNativeStackNavigator<SettingsTabParamList>();

export const SettingsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen
      name="About"
      component={AboutScreen}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="AudioSettings"
      component={AudioSettingsScreen}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="LinkedFolders"
      component={LinkedFoldersScreen}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
