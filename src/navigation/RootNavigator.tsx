import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {StartScreen} from '../screens/Start/StartScreen';
import {PlayerScreen} from '../screens/Player/PlayerScreen';
import {PreferencesScreen} from '../screens/Preferences/PreferencesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={StartScreen} />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{orientation: 'default'}}
      />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
    </Stack.Navigator>
  );
};
