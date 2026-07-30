// ────────────────────────────────────────────────────────
// Simba Player — GenreScreen (Phase 20)
// ────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {useNavigation} from '@react-navigation/native';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useGenreScreen} from './useGenreScreen';

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GenreScreen: React.FC = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {genre, tracks, trackCount, handlePlayTrack} = useGenreScreen();
  const {styles: animStyles} = useAnimatedEntrance(Math.min(tracks.length, 20), {
    staggerDelay: 40,
    direction: 'up',
    duration: 300,
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary" style={{flex: 1}}>
          Genre
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}>
        {/* ── Genre Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.genreIcon, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon name="music" size={36} color={colors.accent.gold} />
          </View>
          <AppText variant="h1" color="primary" style={styles.genreName}>
            {genre}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </AppText>
        </View>

        {/* ── Track List ── */}
        {tracks.length === 0 ? (
          <EmptyState
            icon="music"
            title="No Tracks Found"
            description={`No tracks found in the "${genre}" genre.`}
          />
        ) : (
          tracks.map((track, index) => (
            <TouchableOpacity
              key={track.uri}
              style={[
                styles.trackItem,
                {backgroundColor: colors.background.elevated},
                animStyles[index] || {},
              ]}
              activeOpacity={0.7}
              onPress={() => handlePlayTrack(track.uri, track.title)}>
              <View
                style={[
                  styles.trackNumber,
                  {backgroundColor: colors.accent.goldDim},
                ]}>
                <AppText variant="caption" color="secondary">
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.trackInfo}>
                <AppText variant="body2" color="primary" numberOfLines={1}>
                  {track.title}
                </AppText>
                <AppText variant="caption" color="tertiary" numberOfLines={1}>
                  {track.artist}
                </AppText>
              </View>
              <AppText variant="caption" color="tertiary">
                {formatDuration(track.duration)}
              </AppText>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  genreIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  genreName: {
    fontWeight: '700',
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  trackNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
});
