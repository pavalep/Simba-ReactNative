import React, {ReactNode} from 'react';
import {View, ScrollView, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBottomChromeBand} from '../../../infrastructure/player/miniPlayerChrome';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';

export interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  header?: ReactNode;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  header,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  // The app's ONE bottom-chrome rule: the safe area, or the
  // mini-player dock if one is up, plus a spacing step.
  const bottomChromeBand = useBottomChromeBand();

  const rootStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: insets.top,
    paddingBottom: bottomChromeBand,
  };

  const contentStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: spacing.lg,
  };

  if (scrollable) {
    return (
      <View style={[rootStyle, style]}>
        {header}
        <ScrollView
          contentContainerStyle={[contentStyle, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[rootStyle, style]}>
      {header}
      <View style={[contentStyle, contentContainerStyle]}>{children}</View>
    </View>
  );
};

export default ScreenContainer;
