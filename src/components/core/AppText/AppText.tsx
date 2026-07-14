import React from 'react';
import {Text, TextProps, StyleSheet} from 'react-native';
import {useColors} from '../../../context/ThemeContext';
import {typography} from '../../../constants/typography';

interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body1',
  color,
  style,
  children,
  ...props
}) => {
  const colors = useColors();
  return (
    <Text
      style={[
        {color: color || colors.text},
        typography[variant],
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
};
