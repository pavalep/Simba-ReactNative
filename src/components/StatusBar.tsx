import React from 'react';
import {StatusBar, StatusBarProps} from 'react-native';
import {useTheme} from '../theme';

interface SimbaStatusBarProps extends Omit<StatusBarProps, 'barStyle' | 'hidden'> {
  /** Determines StatusBar behavior:
   *  - 'home': translucent, theme-aware barStyle
   *  - 'player': hidden (full controls overlay)
   *  - 'modal': translucent, theme-aware barStyle  */
  variant: 'home' | 'player' | 'modal';
}

/**
 * Centralized StatusBar component.
 *
 * Automatically reads the current theme and applies the correct
 * `barStyle` and `backgroundColor` for each variant.
 */
export const SimbaStatusBar: React.FC<SimbaStatusBarProps> = ({
  variant,
  ...rest
}) => {
  const {isDark} = useTheme();

  if (variant === 'player') {
    return <StatusBar hidden barStyle="light-content" {...rest} />;
  }

  const barStyle: StatusBarProps['barStyle'] = isDark
    ? 'light-content'
    : 'dark-content';

  return (
    <StatusBar
      hidden={false}
      barStyle={barStyle}
      backgroundColor="transparent"
      translucent
      {...rest}
    />
  );
};
