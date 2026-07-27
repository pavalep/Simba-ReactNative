import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppSelector} from '../store';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {VideoPlayerScreen} from '../screens/VideoPlayer/VideoPlayerScreen';
import {AudioPlayerScreen} from '../screens/AudioPlayer/AudioPlayerScreen';
import {PreferencesScreen} from '../screens/Preferences/PreferencesScreen';
import {SettingsStack} from './SettingsStack';
import {SplashScreen} from '../screens/Splash/SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const hasLaunched = useAppSelector(state => state.settings.hasLaunched);

  return (
    <Stack.Navigator
      initialRouteName={hasLaunched ? 'MainTabs' : 'Splash'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="VideoPlayer"
        component={VideoPlayerScreen}
        options={{
          orientation: 'landscape',
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="AudioPlayer"
        component={AudioPlayerScreen}
        options={{
          animation: 'slide_from_bottom',
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
      <Stack.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};
