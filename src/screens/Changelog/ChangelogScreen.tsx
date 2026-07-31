import React, {useMemo, useRef, useEffect} from 'react';
import {View, ScrollView, StyleSheet, Animated, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {ChangelogScreenProps} from '../../navigation/types';

type Props = ChangelogScreenProps;

interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
}

const CHANGELOG: VersionEntry[] = [
  {
    version: '1.1.0',
    date: 'July 2026',
    changes: [
      'Profile screen with real playback stats and recently played strip',
      'Playback history with filters, search, and one-tap resume',
      'Audio settings: sample rate, replay gain, gapless playback, audio delay',
      '10-band equalizer with presets and dialogue boost',
      'Accessibility: larger controls and high-contrast subtitles',
      'Silent session restore and expiry detection for Google sign-in',
      'Preferences: cache management, library rescan, privacy and terms pages',
      'Subtitle language and style pickers wired to the video player',
      'Credits screen and LGPL license notices',
    ],
  },
  {
    version: '1.0.0',
    date: 'July 2026',
    changes: [
      'Initial public release',
      'Video player with MPV backend and hardware acceleration',
      'Audio player with waveform visualizer and queue management',
      'Folder linking wizard for local media scanning',
      'Google OAuth sign-in with session persistence',
      'Library screen with audio, artist, album, and folder segments',
      'Home screen with hero banner, recently played, and pinned playlists',
      'Settings with audio, subtitle, and theme customization',
      'Bookmark system for named positions in media files',
      'Mini audio player with persistent playback across screens',
    ],
  },
  {
    version: '0.9.0',
    date: 'June 2026',
    changes: [
      'Beta release — feature-complete preview',
      'Audio player queue and shuffle/repeat controls',
      'Artist and album detail screens with full metadata',
      'Pull-to-refresh media scanning in Library',
      'Linked folders management with swipe-to-delete',
      'Now-playing screen with album art and seek controls',
      'Search screen with media filtering',
    ],
  },
  {
    version: '0.8.0',
    date: 'May 2026',
    changes: [
      'Alpha release — core playback features',
      'Basic video and audio playback via MPV',
      'Folder-based media library with automatic scanning',
      'Settings screen with configurable preferences',
      'Dark and light theme support',
      'Internal header and navigation system',
    ],
  },
];

export const ChangelogScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
        versionCard: {
          backgroundColor: colors.background.highlightDim,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
        versionHeader: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        },
        versionLabel: {
          fontWeight: '700' as const,
        },
        dateLabel: {
          marginBottom: spacing.sm,
        },
        bulletItem: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: spacing.xs,
          paddingRight: spacing.sm,
        },
        bullet: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.accent.gold,
          marginTop: 7,
          marginRight: spacing.sm,
          flexShrink: 0,
        },
        bulletText: {
          flex: 1,
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
      <InternalHeader title="Changelog" />
      <Animated.View style={[styles.root, {opacity: fadeAnim}]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{paddingBottom: spacing.xxxl}}
          showsVerticalScrollIndicator={false}>
          {/* 59.1: virtualized changelog cards */}
          <FlatList
            data={CHANGELOG}
            keyExtractor={entry => entry.version}
            renderItem={({item: entry}) => (
              <View style={styles.versionCard}>
                <View style={styles.versionHeader}>
                  <AppText variant="h3" color="accent" style={styles.versionLabel}>
                    {entry.version}
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    {entry.date}
                  </AppText>
                </View>
                <FlatList
                  data={entry.changes}
                  keyExtractor={(change, idx) => String(idx)}
                  renderItem={({item: change}) => (
                    <View style={styles.bulletItem}>
                      <View style={styles.bullet} />
                      <AppText
                        variant="body2"
                        color="secondary"
                        style={styles.bulletText}>
                        {change}
                      </AppText>
                    </View>
                  )}
                  scrollEnabled={false}
                  initialNumToRender={entry.changes.length}
                />
              </View>
            )}
            scrollEnabled={false}
            initialNumToRender={CHANGELOG.length}
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};
