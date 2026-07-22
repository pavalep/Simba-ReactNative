import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeTabParamList} from './types';
import {HomeScreen} from '../screens/Home/HomeScreen';
import {SearchScreen} from '../screens/Search/SearchScreen';
import {NowPlayingScreen} from '../screens/NowPlaying/NowPlayingScreen';

const Stack = createNativeStackNavigator<HomeTabParamList>();

export const HomeStack: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="NowPlaying"
      component={NowPlayingScreen}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);
