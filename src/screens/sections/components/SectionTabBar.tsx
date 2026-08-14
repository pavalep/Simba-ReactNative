// ─── v10: Shared Tab-Bar Contract ──────────────────────────────────────
// Phase 1.3. Kills the styling drift documented in the v10 spec §2 row 2:
//   • Archive used hairlineWidth border + hardcoded rgba + radius 2 indicator
//   • Shows used hairlineWidth border (default border color)
//   • content padding / tab width / indicator radius drifted per screen
// Every section renders THIS bar; overrides come only from the section
// config (never per-screen inline styles).
//
// Contract (unified for all 8 sections):
//   • scrollEnabled — tabs scroll when they overflow the screen
//   • gold 3px pill indicator on the active tab
//   • typography.tab labels (no uppercase transform)
//   • colors.background.primary bar, 1px highlightDim bottom border
//   • auto-width tabs, min 84pt, spacing.xs edge padding
//
// Note on `lazy`: it is a TabView prop, not a TabBar prop — the shared
// shell (Wave 2) enables it by default. Accessible roles come from
// react-native-tab-view's TabBarItem, which already sets
// accessibilityRole="tab" + accessibilityState={{selected}} per tab.

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

  // react-native-tab-view v4 has no direct TabBar `labelStyle` prop — label
  // styles are per-route TabDescriptor entries. Compose them here so every
  // section renders typography.tab labels without per-screen styling.
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
