import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LibraryTabParamList} from './types';
import {LibraryScreen} from '../screens/Library/LibraryScreen';
import {FolderBrowserScreen} from '../screens/FolderBrowser/FolderBrowserScreen';
import {PlaylistDetailScreen} from '../screens/PlaylistDetail/PlaylistDetailScreen';

const Stack = createNativeStackNavigator<LibraryTabParamList>();

export const LibraryStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Library" component={LibraryScreen} />
    <Stack.Screen
      name="FolderBrowser"
      component={FolderBrowserScreen}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="PlaylistDetail"
      component={PlaylistDetailScreen}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
