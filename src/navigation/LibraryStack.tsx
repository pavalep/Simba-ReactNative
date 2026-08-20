import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LibraryScreen} from '../screens/Library';
import type {LibraryTabParamList} from './types';

const Stack = createNativeStackNavigator<LibraryTabParamList>();

export const LibraryStack: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Library"
    screenOptions={{headerShown: false}}>
    <Stack.Screen name="Library" component={LibraryScreen} />
  </Stack.Navigator>
);
