// ────────────────────────────────────────────────────────
// Simba Player — AlbumScreen (Phase 17)
// Composes: AlbumHero, AlbumMetaBar, AlbumActionRow, AlbumTrackList
// ────────────────────────────────────────────────────────

import React, {useMemo, useRef} from 'react';
import {View, Animated, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {AlbumHero} from './components/AlbumHero';
import {AlbumMetaBar} from './components/AlbumMetaBar';
import {AlbumActionRow} from './components/AlbumActionRow';
import {AlbumTrackList} from './components/AlbumTrackList';
import {useAlbumScreen} from './useAlbumScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'AlbumScreen'>;

const HERO_HEIGHT = 400;

export const AlbumScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    albumName,
    artistName,
    sortedTracks,
    albumMeta,
    isCurrentTrack,
    isPlaying,
    formatDuration,
    formatTotalDuration,
    handlers,
  } = useAlbumScreen();

  // ── Stagger entrance for content sections ──
  const entrance = useAnimatedEntrance(3, {
    staggerDelay: 80,
    direction: 'up',
    duration: 350,
  });

  // ── Parallax scroll handler ──
  const onScroll = useMemo(
    () =>
      Animated.event(
        [{nativeEvent: {contentOffset: {y: scrollY}}}],
        {useNativeDriver: true},
      ),
    [scrollY],
  );

  const hasTracks = sortedTracks.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* Background gradient */}
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Back button (fixed, overlaid) ── */}
      <View style={[styles.backBtnContainer, {top: insets.top + 8}]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {backgroundColor: colors.background.highlight},
          ]}
          onPress={handlers.goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Main scrollable content ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: insets.bottom + 104},
        ]}>
        {/* ── Album hero (parallax) ── */}
        <AlbumHero
          albumName={albumName}
          artistName={artistName}
          scrollY={scrollY}
          totalHeight={HERO_HEIGHT}
          onArtistPress={handlers.goToArtist}
        />

        {/* ── Meta bar ── */}
        <Animated.View style={[styles.sectionWrapper, entrance.styles[0]]}>
          <AlbumMetaBar
            year={albumMeta.year}
            trackCount={albumMeta.trackCount}
            totalDuration={formatTotalDuration(albumMeta.totalDuration)}
            genres={albumMeta.genres}
          />

          {/* Divider */}
          <View style={[styles.divider, {backgroundColor: colors.border.subtle}]} />
        </Animated.View>

        {/* ── Action row (entrance 1) ── */}
        <Animated.View style={entrance.styles[0]}>
          <AlbumActionRow
            onPlayAll={handlers.playAll}
            onShuffle={handlers.shuffleAll}
            disabled={!hasTracks}
          />
          <View style={[styles.divider, {backgroundColor: colors.border.subtle}]} />
        </Animated.View>

        {/* ── Track list (entrance 2) ── */}
        <Animated.View style={entrance.styles[1]}>
          <View style={styles.trackListSection}>
            <AppText variant="h3" color="primary" style={styles.trackListTitle}>
              Tracks
            </AppText>
            <AlbumTrackList
              tracks={sortedTracks}
              isCurrentTrack={isCurrentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlers.playTrack}
              formatDuration={formatDuration}
            />
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backBtnContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 0,
  },
  sectionWrapper: {
    marginTop: -8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  trackListSection: {
    paddingTop: spacing.sm,
  },
  trackListTitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
