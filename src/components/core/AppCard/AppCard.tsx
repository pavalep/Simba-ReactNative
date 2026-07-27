import React from 'react';
import {View, ViewStyle, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {radius} from '../../../theme/tokens';

interface AppCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  accent?: boolean;
  glass?: boolean;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  elevated = false,
  accent = false,
  glass = false,
  active = false,
  onPress,
  onLongPress,
  style,
}) => {
  const {colors, shadows} = useTheme();

  // Build border style: glass gets a top highlight (2px), others hairline
  const baseBorderWidth = StyleSheet.hairlineWidth;
  let finalBorderWidth = baseBorderWidth;
  let finalBorderTopWidth: number | undefined;
  let finalBorderColor: string = 'transparent';
  let finalBorderTopColor: string | undefined;

  if (active) {
    // Active overrides everything: solid gold border
    finalBorderWidth = 1;
    finalBorderColor = colors.accent.gold;
  } else if (accent) {
    // Accent: gold-tinted hairline
    finalBorderWidth = 1;
    finalBorderColor = colors.accent.goldDim;
  } else if (glass) {
    // Glass: subtle bottom borders + 2px top highlight
    finalBorderColor = colors.border.subtle;
    finalBorderTopWidth = 2;
    finalBorderTopColor = colors.border.emphasis;
  } else if (elevated) {
    // Elevated: subtle border all around
    finalBorderColor = colors.border.subtle;
  }

  const dynamicStyle: ViewStyle = {};

  if (glass) {
    dynamicStyle.backgroundColor = colors.background.glass;
    Object.assign(dynamicStyle, shadows.sm);
  } else if (elevated) {
    dynamicStyle.backgroundColor = colors.background.elevated;
    Object.assign(dynamicStyle, shadows.sm);
  } else {
    dynamicStyle.backgroundColor = colors.background.primary;
  }

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? {activeOpacity: 0.8, onPress, onLongPress}
    : {};

  return (
    <Container
      accessibilityRole={onPress ? 'button' : 'none'}
      style={[
        styles.base,
        {
          borderWidth: finalBorderWidth,
          borderTopWidth: finalBorderTopWidth,
          borderColor: finalBorderColor,
          borderTopColor: finalBorderTopColor,
        },
        dynamicStyle,
        style,
      ]}
      {...containerProps}>
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md, // 12px — consistent card radius
  },
});
