import React, {ReactNode} from 'react';
import {View, ScrollView, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  scrollable = true,
  style,
  contentContainerStyle,
  header,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const rootStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
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
