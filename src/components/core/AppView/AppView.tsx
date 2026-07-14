import React from 'react';
import {View, ViewProps, StyleSheet} from 'react-native';
import {useColors} from '../../../context/ThemeContext';

interface AppViewProps extends ViewProps {
  bg?: string;
}

export const AppView: React.FC<AppViewProps> = ({
  bg,
  style,
  children,
  ...props
}) => {
  const colors = useColors();
  return (
    <View
      style={[{backgroundColor: bg || colors.background}, style]}
      {...props}>
      {children}
    </View>
  );
};
