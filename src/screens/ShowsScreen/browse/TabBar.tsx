// ─── Shows Screen — per-screen TabBar copy ───────────────────────────
// Identical to the legacy shared SectionTabBar; copied so each screen
// owns its own shell without a shared `sections/` folder. Used by both
// ShowsScreen (search / today / browse tabs) and any future tab-based
// screen.

import React, {useMemo} from 'react';
import {StyleSheet, type StyleProp, type TextStyle} from 'react-native';
import {
  TabBar,
  type NavigationState,
  type Route,
  type SceneRendererProps,
  type TabDescriptor,
} from 'react-native-tab-view';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';

export type SectionTabBarProps = SceneRendererProps & {
  navigationState: NavigationState<Route>;
  options?: Record<string, TabDescriptor<Route>> | undefined;
};

export function SectionTabBar(props: SectionTabBarProps) {
  const {colors, typography} = useTheme();
  const {options, navigationState} = props;

  const labelStyle = useMemo(
    () => [typography.tab, styles.tabLabel] as unknown as StyleProp<TextStyle>,
    [typography],
  );

  const mergedOptions = useMemo(() => {
    const base = options ?? {};
    return navigationState.routes.reduce<Record<string, TabDescriptor<Route>>>(
      (acc, route) => {
        const routeOptions = base[route.key];
        acc[route.key] = {
          ...routeOptions,
          labelStyle: routeOptions?.labelStyle ?? labelStyle,
        };
        return acc;
      },
      {},
    );
  }, [navigationState.routes, options, labelStyle]);

  return (
    <TabBar
      {...props}
      options={mergedOptions}
      scrollEnabled
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.background.primary,
          borderBottomColor: colors.background.highlightDim,
        },
      ]}
      indicatorStyle={[styles.tabIndicator, {backgroundColor: colors.accent.gold}]}
      activeColor={colors.accent.gold}
      inactiveColor={colors.text.secondary}
      tabStyle={styles.tab}
      contentContainerStyle={styles.tabBarContent}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    height: 3,
    borderRadius: radius.full,
  },
  tabLabel: {
    textTransform: 'none',
  },
  tab: {
    width: 'auto',
    minWidth: 84,
  },
  tabBarContent: {
    paddingHorizontal: spacing.xs,
  },
});