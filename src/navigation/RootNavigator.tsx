import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppSelector} from '../store';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {SettingsStack} from './SettingsStack';
import {SplashScreen} from '../screens/Splash/SplashScreen';
import {VideoPlayerScreen} from '../screens/VideoPlayer/VideoPlayerScreen';
import {AudioPlayerScreen} from '../screens/AudioPlayer/AudioPlayerScreen';
import {PreferencesScreen} from '../screens/Preferences/PreferencesScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';

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
        options={{
          orientation: 'landscape',
          animation: 'fade',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <VideoPlayerScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AudioPlayer"
        options={{
          animation: 'slide_from_bottom',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <AudioPlayerScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Preferences"
        options={{
          animation: 'slide_from_right',
          presentation: 'modal',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <PreferencesScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
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
