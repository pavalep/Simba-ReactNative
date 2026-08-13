import React, {useMemo, useRef, useCallback, useEffect, useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Animated,
  Share,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAccessibility} from '../../hooks/useAccessibility';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {useAppDispatch} from '../../store';
import {resetToDefaults} from '../../store/slices/settingsSlice';
import {AboutScreenProps} from '../../navigation/types';
import {svgPaths} from '../../constants/svgPaths';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import textContent from './textContent';

type Props = AboutScreenProps;

interface LinkItem {
  label: string;
  description?: string;
  action: 'navigate' | 'url' | 'contact' | 'share';
  route?: string;
  url?: string;
  icon: 'listMusic' | 'list' | 'folder' | 'settings' | 'music' | 'video';
}

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.simbaplayer';
const GITHUB_ISSUES_URL = 'https://github.com/diegopvlk/Cine/issues';

const LINK_ITEMS: LinkItem[] = [
  {
    label: textContent.changelog,
    action: 'navigate',
    route: 'Changelog',
    icon: 'listMusic',
  },
  {
    label: textContent.credits,
    description: 'Contributors and libraries used',
    action: 'navigate',
    route: 'Credits',
    icon: 'list',
  },
  {
    label: textContent.openSourceLicenses,
    action: 'navigate',
    route: 'Licenses',
    icon: 'folder',
  },
  {
    label: textContent.privacyPolicy,
    // 51.2: in-app Privacy screen instead of an external URL
    action: 'navigate',
    route: 'Privacy',
    icon: 'settings',
  },
  {
    label: textContent.termsOfService,
    // 51.2: in-app Terms screen instead of an external URL
    action: 'navigate',
    route: 'Terms',
    icon: 'settings',
  },
  {
    label: textContent.rateOnPlayStore,
    action: 'url',
    url: PLAY_STORE_URL,
    icon: 'music',
  },
  {
    label: textContent.shareApp,
    description: 'Send Simba Player to a friend',
    action: 'share',
    icon: 'music',
  },
  {
    label: textContent.reportBug,
    action: 'url',
    url: GITHUB_ISSUES_URL,
    icon: 'video',
  },
  {
    label: textContent.contactFeedback,
    action: 'contact',
    url: 'mailto:support@simbaplayer.app?subject=Simba%20Player%20Feedback',
    icon: 'settings',
  },
];

/** 25.2: tech stack shown in the "Built with" section. */
const BUILT_WITH = ['React Native', 'TypeScript', 'MPV', 'Redux Toolkit'];

const SHARE_MESSAGE = `Simba Player — your media, your way. Watch videos, listen to music, and build playlists with a gorgeous player. ${PLAY_STORE_URL}`;

export const AboutScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const {reduceMotion} = useAccessibility();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [resetVisible, setResetVisible] = useState(false);

  // ── Animations ───────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const entrance = useAnimatedEntrance(LINK_ITEMS.length, {
    staggerDelay: 60,
    direction: 'up',
  });

  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — render fully visible, skip fade + bounce
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }
    // Fade in entire screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Scale bounce on logo
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, scaleAnim, reduceMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        content: {
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        logoSection: {
          alignItems: 'center',
          marginTop: spacing.xl,
        },
        logo: {
          width: 72,
          height: 72,
          resizeMode: 'contain',
        },
        appName: {
          marginTop: spacing.md,
          marginBottom: spacing.xs,
        },
        tagline: {
          marginBottom: spacing.sm,
        },
        versionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        divider: {
          width: '40%',
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.md,
        },
        builtWithCard: {
          width: '100%',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        techChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
        },
        linkItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          marginBottom: spacing.xs,
          minHeight: 52,
        },
        linkIcon: {
          marginRight: spacing.sm,
        },
        linkLabel: {
          flex: 1,
        },
        linkDescription: {
          flex: 1,
          marginTop: 2,
        },
        footer: {
          alignItems: 'center',
          paddingBottom: insets.bottom + spacing.lg,
          paddingTop: spacing.md,
        },
        resetButton: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xxl,
        },
      }),
    [colors, insets.bottom],
  );

  const handleLinkPress = useCallback(
    async (item: LinkItem) => {
      switch (item.action) {
        case 'navigate':
          if (item.route) {
            (navigation as any).navigate(item.route);
          }
          break;
        case 'url':
        case 'contact':
          if (item.url) {
            Linking.openURL(item.url).catch(() => {});
          }
          break;
        case 'share': {
          // 25.7: native share sheet with app text + store URL
          try {
            await Share.share({message: SHARE_MESSAGE});
          } catch {
            // user cancelled — nothing to do
          }
          break;
        }
      }
    },
    [navigation],
  );

  const handleConfirmReset = useCallback(() => {
    setResetVisible(false);
    dispatch(resetToDefaults());
  }, [dispatch]);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
        <InternalHeader title={textContent.headerTitle} titleVariant="displaySerif" />
        <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
          {/* Logo with bounce animation */}
          <Animated.View
            style={[styles.logoSection, {transform: [{scale: scaleAnim}]}]}>
            <Image
              source={isDark ? svgPaths.appLogoDark : svgPaths.appLogoLight}
              style={styles.logo}
            />
          </Animated.View>

          <AppText variant="h3" color="accent" style={styles.appName}>
            {textContent.appName}
          </AppText>

          <AppText variant="body2" color="tertiary" style={styles.tagline}>
            {textContent.tagline}
          </AppText>

          <View style={styles.versionRow}>
            <AppText variant="caption" color="secondary">
              {textContent.version}
            </AppText>
          </View>

          {/* 25.2: Built with */}
          <View style={styles.builtWithCard}>
            <AppText
              variant="caption"
              color="tertiary"
              style={{width: '100%', textAlign: 'center', marginBottom: 4}}>
              Built with
            </AppText>
            {BUILT_WITH.map(tech => (
              <View
                key={tech}
                style={[
                  styles.techChip,
                  {backgroundColor: colors.background.primary},
                ]}>
                <AppText variant="caption" color="accent">
                  {tech}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* 59.1: virtualized link items (25.10 staggered entrance) */}
          <FlatList
            data={LINK_ITEMS}
            keyExtractor={item => item.label}
            renderItem={({item, index: idx}) => (
              <Animated.View style={[styles.linkItem, entrance.styles[idx]]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleLinkPress(item)}
                  style={[StyleSheet.absoluteFill, {flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg}]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}>
                  <SvgIcon
                    name={item.icon}
                    size={18}
                    color={colors.accent.gold}
                    style={styles.linkIcon}
                  />
                  <AppText variant="body1" color="primary" style={styles.linkLabel}>
                    {item.label}
                  </AppText>
                  <SvgIcon
                    name="chevronRight"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
            scrollEnabled={false}
            initialNumToRender={LINK_ITEMS.length}
          />
        </Animated.View>

        {/* Footer with reset button (25.9: dialog, not raw Alert) */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setResetVisible(true)}
            style={styles.resetButton}
            accessibilityRole="button"
            accessibilityLabel={textContent.resetAllSettings}>
            <AppText variant="body1" color="error">
              {textContent.resetAllSettings}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ConfirmDialog
        visible={resetVisible}
        title={textContent.resetAlertTitle}
        message={textContent.resetAlertMessage}
        confirmLabel={textContent.reset}
        cancelLabel={textContent.cancel}
        destructive
        onConfirm={handleConfirmReset}
        onCancel={() => setResetVisible(false)}
      />
    </View>
  );
};
