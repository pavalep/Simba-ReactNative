import React from 'react';
import {View, StyleSheet} from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {TabParamList} from './types';
import {HomeStack} from './HomeStack';
import {LibraryStack} from './LibraryStack';
import {FloatingTabBar} from '../components/tabbar/FloatingTabBar';

const Tab = createBottomTabNavigator<TabParamList>();
const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

export const TabNavigator: React.FC = () => (
  <View style={styles.root}>
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={renderTabBar}
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
    </Tab.Navigator>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
