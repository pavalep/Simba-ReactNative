import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {
  AboutScreenProps,
  AudioSettingsScreenProps,
  FolderLinkingWizardScreenProps,
  LinkedFoldersScreenProps,
  ChangelogScreenProps,
  LicensesScreenProps,
} from './types';
import {SettingsTabParamList} from './types';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';
import {AboutScreen} from '../screens/About/AboutScreen';
import {AudioSettingsScreen} from '../screens/AudioSettings/AudioSettingsScreen';
import {LinkedFoldersScreen} from '../screens/LinkedFolders/LinkedFoldersScreen';
import {FolderLinkingWizard} from '../screens/FolderLinkingWizard/FolderLinkingWizard';
import {ChangelogScreen} from '../screens/Changelog/ChangelogScreen';
import {LicensesScreen} from '../screens/Licenses/LicensesScreen';
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
const FolderLinkingWizardRender = (props: FolderLinkingWizardScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <FolderLinkingWizard {...props} />
  </ScreenErrorBoundary>
);
const ChangelogRender = (props: ChangelogScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <ChangelogScreen {...props} />
  </ScreenErrorBoundary>
);
const LicensesRender = (props: LicensesScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <LicensesScreen {...props} />
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
    <Stack.Screen
      name="FolderLinkingWizard"
      component={FolderLinkingWizardRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="Changelog"
      component={ChangelogRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="Licenses"
      component={LicensesRender}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
