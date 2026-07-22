import React from 'react';
import {Text, TextProps} from 'react-native';
import {useTheme, type ThemeContextValue} from '../../../theme';

export type AppTextVariant =
  // New Atlas variants
  | 'h1' | 'h2' | 'h3'
  | 'body1' | 'body2'
  | 'caption' | 'overline'
  | 'mono'
  // Legacy aliases (migrate away)
  | 'h6' | 'subtitle2' | 'small' | 'time';

type TokenColorKey =
  | 'primary' | 'secondary' | 'tertiary'
  | 'accent' | 'error' | 'success' | 'warning';

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: TokenColorKey | string;
}

const variantMap: Record<AppTextVariant, keyof ThemeContextValue['typography']> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body1: 'body1',
  body2: 'body2',
  caption: 'caption',
  overline: 'overline',
  mono: 'mono',
  // Legacy aliases
  h6: 'caption',
  subtitle2: 'body2',
  small: 'caption',
  time: 'caption',
};

const tokenColorKeys: Record<TokenColorKey, keyof ThemeContextValue['colors'] | keyof ThemeContextValue['colors']['text']> = {
  primary: 'text',
  secondary: 'secondary',
  tertiary: 'tertiary',
  accent: 'accent',
  error: 'semantic',
  success: 'semantic',
  warning: 'semantic',
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body1',
  color,
  style,
  children,
  ...props
}) => {
  const {typography, colors} = useTheme();

  const resolvedColor = React.useMemo(() => {
    if (!color) return colors.text.primary;
    // If it's a known token color key
    switch (color as TokenColorKey) {
      case 'primary': return colors.text.primary;
      case 'secondary': return colors.text.secondary;
      case 'tertiary': return colors.text.tertiary;
      case 'accent': return colors.accent.gold;
      case 'error': return colors.semantic.error;
      case 'success': return colors.semantic.success;
      case 'warning': return colors.semantic.warning;
      default: return color; // raw hex string
    }
  }, [color, colors]);

  return (
    <Text
      style={[
        {color: resolvedColor},
        typography[variantMap[variant]],
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
};
