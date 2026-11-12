// ────────────────────────────────────────────────────────
// Simba Player — Credits Screen (Phase 25.3)
// Contributors + libraries grouped by type, staggered entrance
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, ScrollView, StyleSheet, Animated, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {TECH_STACK} from '../../../constants/techStack';
import type {CreditsScreenProps} from '../../../navigation/types';

type Props = CreditsScreenProps;

/** Contributors — team + community acknowledgements. */
const CONTRIBUTORS = [
  'Simba Player team',
  'MPV community',
  'React Native community',
  'Open-source contributors worldwide',
];

export const CreditsScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const entrance = useAnimatedEntrance(TECH_STACK.length + 1, {
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
            <AppText variant="displaySans" color="accent" style={styles.sectionTitle}>
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

        {/* Libraries grouped by type — the app's OWN stack. The list
            is owned by `src/constants/techStack.ts`, the same owner
            the About page's "Built with" card reads. It said Redux
            Toolkit and redux-persist until 2026-11-12; the app has
            used Zustand and MMKV since V17. */}
        <FlatList
          data={TECH_STACK}
          keyExtractor={group => group.title}
          renderItem={({item: group, index: gi}) => (
            <Animated.View style={entrance.styles[gi + 1]}>
              <View style={styles.sectionCard}>
                <AppText variant="displaySans" color="accent" style={styles.sectionTitle}>
                  {group.title}
                </AppText>
                <FlatList
                  data={group.entries}
                  keyExtractor={entry => entry.label}
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
                        {item.label}
                      </AppText>
                    </View>
                  )}
                  scrollEnabled={false}
                  initialNumToRender={group.entries.length}
                />
              </View>
            </Animated.View>
          )}
          scrollEnabled={false}
          initialNumToRender={TECH_STACK.length}
        />

        <Animated.View style={[entrance.styles[TECH_STACK.length]]}>
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
