import React, {useMemo, useRef, useCallback, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {AboutScreenProps} from '../../navigation/types';
import {svgPaths} from '../../constants/svgPaths';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import textContent from './textContent';

type Props = AboutScreenProps;

interface LinkItem {
  label: string;
  action: 'navigate' | 'url' | 'contact';
  route?: string;
  url?: string;
}

const LINK_ITEMS: LinkItem[] = [
  {
    label: textContent.changelog,
    action: 'navigate',
    route: 'Changelog',
  },
  {
    label: textContent.openSourceLicenses,
    action: 'navigate',
    route: 'Licenses',
  },
  {
    label: textContent.privacyPolicy,
    action: 'url',
    url: 'https://simbaplayer.app/privacy',
  },
  {
    label: textContent.termsOfService,
    action: 'url',
    url: 'https://simbaplayer.app/terms',
  },
  {
    label: textContent.rateOnPlayStore,
    action: 'url',
    url: 'https://play.google.com/store/apps/details?id=com.simbaplayer',
  },
  {
    label: textContent.contactFeedback,
    action: 'contact',
    url: 'mailto:support@simbaplayer.app?subject=Simba%20Player%20Feedback',
  },
];

export const AboutScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  // ── Animations ───────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
  }, [fadeAnim, scaleAnim]);

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
          marginTop: spacing.xxxl,
        },
        logo: {
          width: 80,
          height: 80,
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
          marginBottom: spacing.lg,
        },
        divider: {
          width: '40%',
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.xl,
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
        },
        linkItemPressed: {
          backgroundColor: colors.background.elevated,
        },
        linkLabel: {
          flex: 1,
        },
        chevron: {
          fontSize: 16,
          color: colors.text.tertiary,
          marginLeft: spacing.sm,
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
        appVersion: {},
      }),
    [colors, insets.bottom],
  );

  const handleLinkPress = useCallback(
    (item: LinkItem) => {
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
      }
    },
    [navigation],
  );

  const handleResetPress = useCallback(() => {
    const {Alert} = require('react-native');
    Alert.alert(
      textContent.resetAlertTitle,
      textContent.resetAlertMessage,
      [
        {text: textContent.cancel, style: 'cancel' as const},
        {text: textContent.reset, style: 'destructive' as const, onPress: () => {}},
      ],
    );
  }, []);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
        <InternalHeader title={textContent.headerTitle} />
        <Animated.View
          style={[styles.content, {opacity: fadeAnim}]}>
          {/* Logo with bounce animation */}
          <Animated.View
            style={[styles.logoSection, {transform: [{scale: scaleAnim}]}]}>
            <Image
              source={
                isDark ? svgPaths.appLogoDark : svgPaths.appLogoLight
              }
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
            <AppText variant="caption" color="secondary" style={styles.appVersion}>
              {textContent.version}
            </AppText>
          </View>

          <View style={styles.divider} />

          {/* Link items */}
          {LINK_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => handleLinkPress(item)}
              style={styles.linkItem}>
              <AppText variant="body1" color="primary" style={styles.linkLabel}>
                {item.label}
              </AppText>
              <AppText style={styles.chevron}>→</AppText>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Footer with reset button */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleResetPress}
            style={styles.resetButton}>
            <AppText variant="body1" color="error">
              {textContent.resetAllSettings}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};
