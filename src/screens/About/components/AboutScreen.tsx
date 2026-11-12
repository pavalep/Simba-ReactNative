// ────────────────────────────────────────────────────────────────
// Simba Player — About Screen (RC1)
//
// The design this implements is the `About / light` and `About / dark`
// boards in Penpot (page `SIMBA`), drawn by `designs/penpot/profile.js`.
//
// WHAT WAS WRONG HERE (2026-11-12)
// ───────────────────────────────
//
// 1. **The link list was a column of unlabelled icons.** The list was
//    a `FlatList` inside a `alignItems: 'center'` column, and each row
//    declared `width: '100%'` — a circular constraint. The list had no
//    width of its own, so it shrink-wrapped to its content; the label's
//    `flex: 1` then resolved to zero and the row was 32 dp of icon.
//    The rows are now the app's own `SettingsRow`: full width, icon,
//    label, chevron.
//
// 2. **The version was a hard-coded lie.** The page said "Version
//    1.0.0" while the Android build is `1.1.0 (2)`. The version comes
//    from `src/constants/appVersion.ts` now, and a test checks that
//    constant against `android/app/build.gradle`.
//
// 3. **"Built with" named Redux Toolkit.** The app has used Zustand
//    and MMKV since V17 — `package.json` has no `redux` at all. The
//    chips come from `src/constants/techStack.ts`, the same owner the
//    Credits page reads.
//
// 4. **There were TWO resets.** The Profile carries "Reset preferences"
//    and the About page carried a red "Reset all settings". The Profile
//    owns the reset (`md/CONTENT_OWNERSHIP.md`), so the About page's
//    is gone; the linked folders are unlinked from the Profile's own
//    "Linked folders" page.
//
// See `md/ABOUT_PAGE_FIX.md`.
// ────────────────────────────────────────────────────────────────

import React, {useMemo, useRef, useCallback, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Image,
  Linking,
  Animated,
  Share,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {SettingsRow} from '../../../components/utility/SettingsRow/SettingsRow';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {AboutScreenProps} from '../types';
import {svgPaths} from '../../../constants/svgPaths';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import textContent from '../related/textContent';
import {APP_VERSION_LABEL} from '../../../constants/appVersion';
import {BUILT_WITH_CHIPS} from '../../../constants/techStack';
import {
  ISSUES_URL as GITHUB_ISSUES_URL,
  PLAY_STORE_URL,
  supportMailto,
} from '../../../constants/links';

type Props = AboutScreenProps;

interface LinkItem {
  label: string;
  description?: string;
  action: 'navigate' | 'url' | 'contact' | 'share';
  /**
   * W22 D-020: kept as `string` (not tightened to
   * `keyof RootStackParamList`) because the typed
   * `navigation.navigate` has a variadic signature that
   * doesn't distribute over a 2-tuple of `string` route
   * names — the original `(navigation as any)` was hiding
   * this distribution problem. The current fix uses the
   * documented `as never` escape hatch instead. A W22
   * follow-up can narrow the `LinkItem.route` type once
   * `@react-navigation/native` ships the `[RouteName, params?]`
   * tuple overload.
   */
  route?: string;
  url?: string;
  /**
   * The row's glyph — the app's own icon set, one per row.
   *
   * These are the nine the About board draws (`designs/penpot/
   * profile.js`, `aboutBoard`): a history clock for the changelog, an
   * award for the credits, a book for the licences, a lock for the
   * privacy policy, an info mark for the terms, a trophy for the store
   * rating, a share glyph for the share row, an alert circle for the
   * bug report and a megaphone for the contact row. Before this pass
   * the list drew a music note for three different rows and a gear for
   * three more — the icon said nothing.
   */
  icon:
    | 'history'
    | 'award'
    | 'book'
    | 'lock'
    | 'info'
    | 'trophy'
    | 'share'
    | 'alertCircle'
    | 'megaphone';
}

/**
 * The two rows that leave the app.
 *
 * Both URLs were WRONG until 2026-11-12 and were already recorded as
 * defects in `md/PROFILE_RC1_REFACTOR.md` §7:
 *
 *   • the store link said `com.simbaplayer`, but the app's
 *     `applicationId` is `com.simba.player` (`android/app/build.gradle`)
 *     — so the row opened a different app's listing, or none;
 *   • the bug report said `github.com/diegopvlk/Cine/issues`, which is
 *     a different project entirely — the app's repo is
 *     `pavalep/Simba-ReactNative`.
 *
 * Both now live in `src/constants/links.ts`, which owns the app's
 * outbound links once (and the support address, which was a dead
 * domain — see the file's own note).
 */

const LINK_ITEMS: LinkItem[] = [
  {
    label: textContent.changelog,
    action: 'navigate',
    route: 'Changelog',
    icon: 'history',
  },
  {
    label: textContent.credits,
    description: 'Contributors and libraries used',
    action: 'navigate',
    route: 'Credits',
    icon: 'award',
  },
  {
    label: textContent.openSourceLicenses,
    action: 'navigate',
    route: 'Licenses',
    icon: 'book',
  },
  {
    label: textContent.privacyPolicy,
    // 51.2: in-app Privacy screen instead of an external URL
    action: 'navigate',
    route: 'Privacy',
    icon: 'lock',
  },
  {
    label: textContent.termsOfService,
    // 51.2: in-app Terms screen instead of an external URL
    action: 'navigate',
    route: 'Terms',
    icon: 'info',
  },
  {
    label: textContent.rateOnPlayStore,
    action: 'url',
    url: PLAY_STORE_URL,
    icon: 'trophy',
  },
  {
    label: textContent.shareApp,
    description: 'Send Simba Player to a friend',
    action: 'share',
    icon: 'share',
  },
  {
    label: textContent.reportBug,
    action: 'url',
    url: GITHUB_ISSUES_URL,
    icon: 'alertCircle',
  },
  {
    label: textContent.contactFeedback,
    action: 'contact',
    url: supportMailto('Simba Player Feedback'),
    icon: 'megaphone',
  },
];

const SHARE_MESSAGE = `Simba Player — your media, your way. Watch videos, listen to music, and build playlists with a gorgeous player. ${PLAY_STORE_URL}`;

/**
 * The chevron of a row that opens something.
 *
 * The app's own 14 px chevron, flush with the 16 dp gutter — the same
 * one the Profile's rows carry.
 */
const Chevron: React.FC = () => {
  const {colors} = useTheme();
  return <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />;
};

export const AboutScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const {reduceMotion} = useAccessibility();
  // The app's ONE bottom-chrome rule: the safe area, or the
  // mini-player dock if one is up, plus a spacing step.
  const bottomChromeInset = useBottomChromeInset();

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
        scroll: {
          flex: 1,
        },
        // The lockup — the logo, the name, the tagline, the version.
        // It is centered, and the rows below it are NOT: a row's
        // hairline runs the full width of the screen and its label
        // sits 16 dp in, which is the app's own row grammar.
        lockup: {
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          marginTop: spacing.lg,
        },
        lockupText: {
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        logo: {
          width: 72,
          height: 72,
          resizeMode: 'contain',
        },
        appName: {
          marginTop: spacing.md,
        },
        // The "Built with" card — the app's elevated surface, 16 dp
        // in from each edge, with the chips wrapped inside it.
        builtWithCard: {
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          padding: spacing.md,
        },
        techChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
        },
        builtWithLabel: {
          width: '100%',
          textAlign: 'center',
          marginBottom: 4,
        },
      }),
    [colors],
  );

  const handleLinkPress = useCallback(
    async (item: LinkItem) => {
      switch (item.action) {
        case 'navigate':
          // W22 D-020: `item.route` is `string` (the array
          // produces runtime route names; see `LINK_ITEMS`).
          // The cast remains `as any` because of the variadic
          // signature limitation (see `navigationHelper.ts` for
          // the full rationale + W22 follow-up).
          if (item.route) {
            navigation.navigate(item.route as any);
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

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
        <InternalHeader title={textContent.headerTitle} />
        <Animated.View style={[styles.scroll, {opacity: fadeAnim}]}>
          <ScrollView
            contentContainerStyle={{paddingBottom: bottomChromeInset + spacing.xl}}
            showsVerticalScrollIndicator={false}>
            {/* The lockup */}
            <Animated.View
              style={[styles.lockup, {transform: [{scale: scaleAnim}]}]}>
              <Image
                source={isDark ? svgPaths.appLogoDark : svgPaths.appLogoLight}
                style={styles.logo}
              />
            </Animated.View>

            <View style={styles.lockupText}>
              <AppText variant="h3" color="accent" style={styles.appName}>
                {textContent.appName}
              </AppText>

              <AppText variant="body2" color="tertiary">
                {textContent.tagline}
              </AppText>

              {/* The version — the app's own build, not a guess. */}
              <AppText variant="caption" color="secondary">
                {APP_VERSION_LABEL}
              </AppText>
            </View>

            {/* 25.2: Built with — the app's OWN stack. */}
            <View style={styles.builtWithCard}>
              <AppText
                variant="caption"
                color="tertiary"
                style={styles.builtWithLabel}>
                Built with
              </AppText>
              {BUILT_WITH_CHIPS.map(tech => (
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

            {/* The links. */}
            <SubsectionTitle label={textContent.moreLinks} variant="displaySerif" />
            {LINK_ITEMS.map((item, idx) => (
              <Animated.View key={item.label} style={entrance.styles[idx]}>
                <SettingsRow
                  label={item.label}
                  description={item.description}
                  leading={
                    <SvgIcon name={item.icon} size={18} color={colors.accent.gold} />
                  }
                  trailing={<Chevron />}
                  onPress={() => handleLinkPress(item)}
                />
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};
