import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/Home/HomeScreen';
import type {HomeTabParamList} from './types';

const Stack = createNativeStackNavigator<HomeTabParamList>();

export const HomeStack: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{headerShown: false}}>
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
);
