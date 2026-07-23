import React, {useRef, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useTheme} from '../../theme';
import {SvgIcon, SvgIconName} from '../utility/SvgIcon';
import {useHaptics} from '../../hooks/useHaptics';

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_HORIZONTAL_MARGIN = 24;
const BOTTOM_MARGIN = 12;
const TAB_BORDER_RADIUS = 32;
const ICON_SIZE = 26;
const ICON_PILL_HEIGHT = 48;
const ICON_PILL_HORIZONTAL_MARGIN = 8; // pill inset from tab edges

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const {colors, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const {width: winW} = useWindowDimensions();
  const haptics = useHaptics();

  // Responsive bar width: cap at 480 on tablets
  const barWidth = Math.min(winW - TAB_BAR_HORIZONTAL_MARGIN * 2, 480);
  const tabCount = Math.max(state.routes.length, 1);
  const tabWidth = barWidth / tabCount;
  const activeIndex = Math.max(state.index, 0);
  const lastTabIndex = Math.max(tabCount - 1, 0);

  // Pill width: tab width minus horizontal margin on each side
  const pillWidth = tabWidth - ICON_PILL_HORIZONTAL_MARGIN * 2;

  // ── Animated values ────────────────────────────────
  const mountAnim = useRef(new Animated.Value(0)).current;

  const animValues = useRef<Animated.Value[]>(
    state.routes.map((_, index) => new Animated.Value(index === activeIndex ? 1 : 0)),
  ).current;

  // ── Mount fade-in animation ──
  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 250,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [mountAnim]);

  // Spring-driven pill offset
  const pillOffset = useRef(new Animated.Value(activeIndex)).current;

  React.useEffect(() => {
    Animated.spring(pillOffset, {
      toValue: activeIndex,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.5,
    }).start();
  }, [activeIndex, pillOffset]);

  // Per-tab spring animations
  React.useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(animValues[i], {
        toValue: i === activeIndex ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
        mass: 0.6,
      }).start();
    });
  }, [activeIndex, state.routes, animValues]);

  // ── Handlers ──────────────────────────────────────
  const onTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      haptics.light();
      (navigation.navigate as (name: string) => void)(routeName);
    }
  };

  const onTabLongPress = (routeKey: string) => {
    navigation.emit({type: 'tabLongPress', target: routeKey});
  };

  // Pill translateX for index N: N * tabWidth + ICON_PILL_HORIZONTAL_MARGIN
  const pillTranslateX = pillOffset.interpolate({
    inputRange: [0, lastTabIndex],
    outputRange: [
      ICON_PILL_HORIZONTAL_MARGIN,
      tabWidth * lastTabIndex + ICON_PILL_HORIZONTAL_MARGIN,
    ],
  });

  // ── Render ─────────────────────────────────────────
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {paddingBottom: insets.bottom + BOTTOM_MARGIN, opacity: mountAnim},
      ]}>
      <View
        style={[
          styles.bar,
          {
            width: barWidth,
            backgroundColor: colors.background.floating,
            borderColor: colors.border.subtle,
            shadowColor: '#000',
            ...shadows.md,
          },
        ]}>
        {/* Animated pill indicator */}
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              backgroundColor: colors.accent.goldDim,
              borderColor: colors.accent.goldGlow,
              transform: [{translateX: pillTranslateX}],
            },
          ]}
        />

        {/* Tabs (icon-only, no labels) */}
        {state.routes.map((route, index) => {
          const isFocused = activeIndex === index;
          const {options} = descriptors[route.key];
          const a11yLabel = `${route.name} tab${isFocused ? ', selected' : ''}`;

          const iconScale = animValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.12],
          });

          const iconOpacity = animValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 1],
          });

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => onTabPress(route.key, route.name, isFocused)}
              onLongPress={() => onTabLongPress(route.key)}
              accessibilityRole="tab"
              accessibilityState={{selected: isFocused}}
              accessibilityLabel={a11yLabel}
              style={[styles.tab, {width: tabWidth}]}>
              <Animated.View
                style={[
                  styles.icon,
                  {
                    transform: [{scale: iconScale}],
                    opacity: iconOpacity,
                  },
                ]}>
                <SvgIcon
                  name={getIconForRoute(route.name)}
                  size={ICON_SIZE}
                  color={
                    isFocused
                      ? colors.accent.gold
                      : colors.text.tertiary
                  }
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

function getIconForRoute(routeName: string): SvgIconName {
  switch (routeName) {
    case 'HomeTab':
      return 'home';
    case 'LibraryTab':
      return 'video';
    default:
      return 'home';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BORDER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    height: ICON_PILL_HEIGHT,
    borderRadius: ICON_PILL_HEIGHT / 2,
    borderWidth: 1,
    top: (TAB_BAR_HEIGHT - ICON_PILL_HEIGHT) / 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 1,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
