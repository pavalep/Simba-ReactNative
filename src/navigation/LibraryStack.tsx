import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {FolderBrowserScreenProps, PlaylistDetailScreenProps, ArtistDetailScreenProps, AlbumDetailScreenProps} from './types';
import {LibraryTabParamList} from './types';
import {LibraryScreen} from '../screens/Library/LibraryScreen';
import {FolderBrowserScreen} from '../screens/FolderBrowser/FolderBrowserScreen';
import {PlaylistDetailScreen} from '../screens/PlaylistDetail/PlaylistDetailScreen';
import {ArtistDetailScreen} from '../screens/Library/ArtistDetailScreen';
import {AlbumDetailScreen} from '../screens/Library/AlbumDetailScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';

const Stack = createNativeStackNavigator<LibraryTabParamList>();

const FolderBrowserRender = (props: FolderBrowserScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <FolderBrowserScreen {...props} />
  </ScreenErrorBoundary>
);
const PlaylistDetailRender = (props: PlaylistDetailScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <PlaylistDetailScreen {...props} />
  </ScreenErrorBoundary>
);
const ArtistDetailRender = (props: ArtistDetailScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <ArtistDetailScreen {...props} />
  </ScreenErrorBoundary>
);
const AlbumDetailRender = (props: AlbumDetailScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <AlbumDetailScreen {...props} />
  </ScreenErrorBoundary>
);

export const LibraryStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Library">
      {(props) => (
        <ScreenErrorBoundary>
          <LibraryScreen {...props} />
        </ScreenErrorBoundary>
      )}
    </Stack.Screen>
    <Stack.Screen
      name="FolderBrowser"
      component={FolderBrowserRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="PlaylistDetail"
      component={PlaylistDetailRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="ArtistDetail"
      component={ArtistDetailRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="AlbumDetail"
      component={AlbumDetailRender}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
