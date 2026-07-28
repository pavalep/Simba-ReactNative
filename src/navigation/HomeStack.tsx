import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SearchScreenProps, NowPlayingScreenProps} from './types';
import {HomeTabParamList} from './types';
import {HomeScreen} from '../screens/Home/HomeScreen';
import {SearchScreen} from '../screens/Search/SearchScreen';
import {NowPlayingScreen} from '../screens/NowPlaying/NowPlayingScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';

const Stack = createNativeStackNavigator<HomeTabParamList>();

const SearchRender = (props: SearchScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <SearchScreen {...props} />
  </ScreenErrorBoundary>
);
const NowPlayingRender = (props: NowPlayingScreenProps) => (
  <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
    <NowPlayingScreen {...props} />
  </ScreenErrorBoundary>
);

export const HomeStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Home">
      {(props) => (
        <ScreenErrorBoundary>
          <HomeScreen {...props} />
        </ScreenErrorBoundary>
      )}
    </Stack.Screen>
    <Stack.Screen
      name="Search"
      component={SearchRender}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="NowPlaying"
      component={NowPlayingRender}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
