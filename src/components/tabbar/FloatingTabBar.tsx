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
import {AppText} from '../core/AppText/AppText';
import {imagePaths} from '../../constants/imagePaths';
import {useHaptics} from '../../hooks/useHaptics';

const TAB_BAR_HEIGHT = 68;
const TAB_BAR_HORIZONTAL_MARGIN = 16;
const BOTTOM_MARGIN = 12;
const TAB_BORDER_RADIUS = 32;
const ICON_SIZE = 24;
const TAB_COUNT = 3;

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
  const tabWidth = barWidth / TAB_COUNT;

  // ── Animated values ────────────────────────────────
  const mountAnim = useRef(new Animated.Value(0)).current;

  const animValues = useRef<Animated.Value[]>(
    state.routes.map(() => new Animated.Value(0)),
  ).current;

  // ── Mount fade-in animation (300ms delay, 250ms) ──
  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 250,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [mountAnim]);

  // Spring-driven pill offset
  const pillOffset = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(pillOffset, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.5,
    }).start();
  }, [state.index, pillOffset]);

  // Per-tab spring animations
  React.useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(animValues[i], {
        toValue: i === state.index ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
        mass: 0.6,
      }).start();
    });
  }, [state.index, state.routes, animValues]);

  // ── Handlers ──────────────────────────────────────
  const onTabPress = (routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      haptics.light();
      navigation.navigate(routeName);
    }
  };

  const onTabLongPress = (routeName: string) => {
    navigation.emit({type: 'tabLongPress', target: routeName});
  };

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
              width: tabWidth - 16,
              backgroundColor: colors.accent.goldDim,
              borderColor: colors.accent.goldGlow,
              transform: [
                {
                  translateX: pillOffset.interpolate({
                    inputRange: [0, TAB_COUNT - 1],
                    outputRange: [8, tabWidth * (TAB_COUNT - 1) + 8],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Tabs */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const {options} = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options.title !== undefined
              ? options.title
              : route.name;

          const iconScale = animValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1],
          });

          const iconBrightness = animValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });

          const a11yLabel = `${label} tab${isFocused ? ', selected' : ''}`;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => onTabPress(route.name, isFocused)}
              onLongPress={() => onTabLongPress(route.name)}
              accessibilityRole="tab"
              accessibilityState={{selected: isFocused}}
              accessibilityLabel={a11yLabel}
              style={[styles.tab, {width: tabWidth}]}>
              <Animated.Image
                source={
                  isFocused
                    ? getIconForRoute(route.name, true)
                    : getIconForRoute(route.name, false)
                }
                style={[
                  styles.icon,
                  {
                    transform: [{scale: iconScale}],
                    opacity: isFocused ? 1 : iconBrightness,
                    tintColor: isFocused
                      ? colors.accent.gold
                      : colors.text.tertiary,
                  },
                ]}
              />
              <AppText
                variant="caption"
                color={isFocused ? colors.accent.gold : undefined}
                style={[
                  styles.label,
                  {
                    color: isFocused
                      ? colors.accent.gold
                      : colors.text.tertiary,
                  },
                ]}>
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

function getIconForRoute(routeName: string, focused: boolean) {
  switch (routeName) {
    case 'HomeTab':
      return focused ? imagePaths.uiHomeGold : imagePaths.uiHomeGray;
    case 'LibraryTab':
      return focused ? imagePaths.uiVideosGray : imagePaths.uiMusicGray;
    case 'SettingsTab':
      return imagePaths.uiSettingsGray;
    default:
      return imagePaths.uiHomeGray;
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
    justifyContent: 'space-evenly',
    overflow: 'hidden',
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    top: (TAB_BAR_HEIGHT - 48) / 2,
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
    resizeMode: 'contain',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
