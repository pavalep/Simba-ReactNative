// ─── HomeHeader ────────────────────────────────────────────────────
// Premium top bar for the Home screen.
//
// Layout (left → right):
//   ┌─────────────────────────────────────────────────────┐
//   │  ◼ SIMBA                          🔍  ◯            │
//   │    YOUR MEDIA, YOUR WAY                           │
//   └─────────────────────────────────────────────────────┘
//
// Notes:
//   • The wordmark "SIMBA" is the hero — large, weight 800,
//     tight letter-spacing, gold accent. The "YOUR MEDIA, YOUR
//     WAY" tagline sits beneath as a small, all-caps, tracked
//     caption in a softer tone. The Home screen may override
//     this with a time-of-day greeting ("GOOD EVENING") so the
//     header mirrors the body greeting.
//   • A single search icon replaces the previous stack of
//     bookmark + search. Bookmarks is now a section on Home
//     (the rail itself is the entry point), so the dedicated
//     header shortcut is redundant.
//   • The profile avatar is a small gold-bordered ring with
//     the user's photo (or initial fallback).
//   • The scanning dot animates next to the wordmark when a
//     library scan is running.

import React, {useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {useAppSelector} from '../../../store';
import {selectAuthUser} from '../../../store/slices/authSlice';
import {BRAND} from '../../../constants/brand';

interface HomeHeaderProps {
  onSettingsPress?: () => void;
  onSearchPress?: () => void;
  onAvatarPress?: () => void;
  isScanning?: boolean;
  avatarUrl?: string | null;
  /** Tagline shown beneath the wordmark. Defaults to the official
   *  brand tagline ("Your media, your way"). The Home screen
   *  may override this — e.g. with a time-of-day greeting — when
   *  it wants the header to mirror the body greeting. */
  tagline?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  onSettingsPress,
  onSearchPress,
  onAvatarPress,
  isScanning,
  avatarUrl,
  tagline = BRAND.tagline,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const navigation = useNavigation<any>();
  const authUser = useAppSelector(selectAuthUser);
  const scanAnim = useRef(new Animated.Value(1)).current;
  const {width} = useWindowDimensions();

  // v7: clamp the brandScript wordmark size 44 → 48 → 52 → 58 px
  // across phone widths. On a 320 dp screen we shrink to 44 to
  // keep the header from colliding with the search/avatar.
  const wordmarkFontSize =
    width < 360 ? 44 : width < 411 ? 48 : width < 480 ? 52 : 58;

  useEffect(() => {
    if (!isScanning) return;
    if (reduceMotion) {
      // 59.7: reduced motion — static scan icon, no pulse loop
      scanAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isScanning, scanAnim, reduceMotion]);

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    }
  };

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      navigation.navigate('Settings');
    }
  };

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary},
      ]}>
      {/* Left: lion mark + wordmark + tagline */}
      <View style={styles.brand}>
        <View
          style={[
            styles.logoContainer,
            {backgroundColor: colors.accent.gold + '18'},
          ]}>
          <SvgIcon name="lion" size={32} color={colors.accent.gold} />
        </View>
        <View style={styles.brandText}>
          <View style={styles.wordmarkRow}>
            <AppText
              variant="brandScript"
              color="accent"
              style={[styles.wordmark, {fontSize: wordmarkFontSize}]}
              numberOfLines={1}>
              {BRAND.name}
            </AppText>
            {isScanning ? (
              <Animated.View
                style={[
                  styles.scanningDot,
                  {
                    backgroundColor: colors.accent.gold,
                    opacity: scanAnim,
                  },
                ]}
                accessibilityLabel="Scanning library"
              />
            ) : null}
          </View>
          <AppText
            variant="bodySmall"
            color="secondary"
            style={styles.tagline}
            numberOfLines={1}>
            {tagline}
          </AppText>
        </View>
      </View>

      {/* Right: search + profile */}
      <View style={styles.actions}>
        {onSearchPress ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSearchPress}
            style={[styles.iconButton, {backgroundColor: colors.background.elevated}]}
            accessibilityLabel="Search"
            accessibilityRole="button">
            <SvgIcon name="search" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAvatarPress}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          style={[
            styles.profileButton,
            {
              borderColor: colors.accent.gold,
              backgroundColor: colors.background.elevated,
            },
          ]}>
          {avatarUrl ? (
            <FastImage
              source={{uri: avatarUrl}}
              style={styles.profileImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <AppText
              variant="h3"
              style={[styles.profileInitial, {color: colors.accent.gold}]}>
              {(authUser?.name?.trim()?.[0] ?? 'A').toUpperCase()}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // ── Brand block (left) ──
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandText: {
    flexShrink: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmark: {
    // v7 brandScript (Allura) — natural letter-spacing + lineHeight
    // from the typography token. Font size is clamped via
    // useWindowDimensions in the component.
    paddingTop: 2, // optical alignment — Allura sits slightly low
  },
  tagline: {
    // v7 bodySmall (14px / 400) — light letter-spacing, no margin.
    letterSpacing: 0.4,
    marginTop: 0,
    opacity: 0.7,
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // ── Actions (right) ──
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
});
