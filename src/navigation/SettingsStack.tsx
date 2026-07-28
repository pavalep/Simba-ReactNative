import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AboutScreenProps, AudioSettingsScreenProps, LinkedFoldersScreenProps} from './types';
import {SettingsTabParamList} from './types';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';
import {AboutScreen} from '../screens/About/AboutScreen';
import {AudioSettingsScreen} from '../screens/AudioSettings/AudioSettingsScreen';
import {LinkedFoldersScreen} from '../screens/LinkedFolders/LinkedFoldersScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';

const Stack = createNativeStackNavigator<SettingsTabParamList>();

const AboutRender = (props: AboutScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <AboutScreen {...props} />
  </ScreenErrorBoundary>
);
const AudioSettingsRender = (props: AudioSettingsScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <AudioSettingsScreen {...props} />
  </ScreenErrorBoundary>
);
const LinkedFoldersRender = (props: LinkedFoldersScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <LinkedFoldersScreen {...props} />
  </ScreenErrorBoundary>
);

export const SettingsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Settings">
      {(props) => (
        <ScreenErrorBoundary>
          <SettingsScreen {...props} />
        </ScreenErrorBoundary>
      )}
    </Stack.Screen>
    <Stack.Screen
      name="About"
      component={AboutRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="AudioSettings"
      component={AudioSettingsRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="LinkedFolders"
      component={LinkedFoldersRender}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
