// ────────────────────────────────────────────────────────
// Simba Player — Credits Screen (Phase 25.3)
// Contributors + libraries grouped by type, staggered entrance
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, ScrollView, StyleSheet, Animated, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import type {CreditsScreenProps} from '../../navigation/types';

type Props = CreditsScreenProps;

interface CreditGroup {
  title: string;
  items: string[];
}

/** 25.3: grouped by type — media engine, framework, state, UI, tooling. */
const CREDIT_GROUPS: CreditGroup[] = [
  {
    title: 'Media Engine',
    items: [
      'MPV — video/audio playback (LGPL-2.1+)',
      'libmpv bindings for React Native',
      'FFmpeg — demuxing and decoding',
    ],
  },
  {
    title: 'Framework',
    items: [
      'React Native (MIT)',
      'TypeScript',
      'React 19',
    ],
  },
  {
    title: 'State & Data',
    items: [
      'Redux Toolkit',
      'redux-persist',
      'AsyncStorage',
    ],
  },
  {
    title: 'Navigation & UI',
    items: [
      'React Navigation',
      'react-native-linear-gradient',
      'react-native-svg',
      'react-native-safe-area-context',
    ],
  },
  {
    title: 'Tooling',
    items: [
      'react-native-haptic-feedback',
      'react-native-orientation-locker',
      'react-native-fast-image',
    ],
  },
];

/** Contributors — team + community acknowledgements. */
const CONTRIBUTORS = [
  'Simba Player team',
  'MPV community',
  'React Native community',
  'Open-source contributors worldwide',
];

export const CreditsScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const entrance = useAnimatedEntrance(CREDIT_GROUPS.length + 1, {
    staggerDelay: 80,
    direction: 'up',
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        scroll: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        },
        sectionCard: {
          backgroundColor: colors.background.highlightDim,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
        sectionTitle: {
          marginBottom: spacing.sm,
          fontWeight: '700',
        },
        bulletItem: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: spacing.xs,
          paddingRight: spacing.sm,
        },
        bulletIcon: {
          marginTop: 3,
          marginRight: spacing.sm,
        },
        bulletText: {
          flex: 1,
        },
        contributorChip: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.xs,
        },
        contributorDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: spacing.sm,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <InternalHeader title="Credits" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: spacing.xxxl}}
        showsVerticalScrollIndicator={false}>
        {/* Contributors (25.3) */}
        <Animated.View style={entrance.styles[0]}>
          <View style={styles.sectionCard}>
            <AppText variant="h3" color="accent" style={styles.sectionTitle}>
              Contributors
            </AppText>
            {/* 59.1: virtualized contributor rows */}
            <FlatList
              data={CONTRIBUTORS}
              keyExtractor={name => name}
              renderItem={({item: name}) => (
                <View style={styles.contributorChip}>
                  <View
                    style={[
                      styles.contributorDot,
                      {backgroundColor: colors.accent.gold},
                    ]}
                  />
                  <AppText variant="body2" color="secondary">
                    {name}
                  </AppText>
                </View>
              )}
              scrollEnabled={false}
              initialNumToRender={CONTRIBUTORS.length}
            />
          </View>
        </Animated.View>

        {/* Libraries grouped by type (25.3) — 59.1: virtualized */}
        <FlatList
          data={CREDIT_GROUPS}
          keyExtractor={group => group.title}
          renderItem={({item: group, index: gi}) => (
            <Animated.View style={entrance.styles[gi + 1]}>
              <View style={styles.sectionCard}>
                <AppText variant="h3" color="accent" style={styles.sectionTitle}>
                  {group.title}
                </AppText>
                <FlatList
                  data={group.items}
                  keyExtractor={item => item}
                  renderItem={({item}) => (
                    <View style={styles.bulletItem}>
                      <SvgIcon
                        name="chevronRight"
                        size={14}
                        color={colors.accent.gold}
                        style={styles.bulletIcon}
                      />
                      <AppText
                        variant="body2"
                        color="secondary"
                        style={styles.bulletText}>
                        {item}
                      </AppText>
                    </View>
                  )}
                  scrollEnabled={false}
                  initialNumToRender={group.items.length}
                />
              </View>
            </Animated.View>
          )}
          scrollEnabled={false}
          initialNumToRender={CREDIT_GROUPS.length}
        />

        <Animated.View style={[entrance.styles[CREDIT_GROUPS.length]]}>
          <AppText
            variant="caption"
            color="tertiary"
            style={{textAlign: 'center', marginTop: spacing.md}}>
            Simba Player — made with ❤ for media lovers
          </AppText>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreditsScreen;
