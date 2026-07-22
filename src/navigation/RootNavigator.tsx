import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {PlayerScreen} from '../screens/Player/PlayerScreen';
import {PreferencesScreen} from '../screens/Preferences/PreferencesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen
      name="MainTabs"
      component={TabNavigator}
    />
    <Stack.Screen
      name="Player"
      component={PlayerScreen}
      options={{
        orientation: 'landscape',
        animation: 'fade',
      }}
    />
    <Stack.Screen
      name="Preferences"
      component={PreferencesScreen}
      options={{
        animation: 'slide_from_right',
        presentation: 'modal',
      }}
    />
  </Stack.Navigator>
);
