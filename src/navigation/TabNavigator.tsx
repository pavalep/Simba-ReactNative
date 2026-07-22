import React from 'react';
import {View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TabParamList} from './types';
import {HomeStack} from './HomeStack';
import {LibraryStack} from './LibraryStack';
import {SettingsStack} from './SettingsStack';
import {FloatingTabBar} from '../components/tabbar/FloatingTabBar';
import {MiniPlayer} from '../components/MiniPlayer/MiniPlayer';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => (
  <View style={{flex: 1}}>
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{headerShown: false}}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStack}
        options={{tabBarLabel: 'Library'}}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{tabBarLabel: 'Settings'}}
      />
    </Tab.Navigator>
    <MiniPlayer />
  </View>
);
