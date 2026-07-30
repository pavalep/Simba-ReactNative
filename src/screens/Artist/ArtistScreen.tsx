// ────────────────────────────────────────────────────────
// Simba Player — ArtistScreen (Phase 16)
// Composes: ArtistHeader, Play All / Shuffle, TopTracks,
//           Discography (horizontal), Bio, remaining tracks
// ────────────────────────────────────────────────────────

import React, {useMemo, useRef, useCallback} from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {AppButton} from '../../components/core/AppButton/AppButton';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {ArtistHeader} from './components/ArtistHeader';
import {ArtistTopTracks} from './components/ArtistTopTracks';
import {ArtistDiscography} from './components/ArtistDiscography';
import {ArtistBio} from './components/ArtistBio';
import AudioWaveform from '../../components/player/AudioWaveform/AudioWaveform';
import {useArtistScreen} from './useArtistScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'ArtistScreen'>;

const HEADER_HEIGHT = 280;
const BACK_BTN_SIZE = 36;

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ArtistScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    artistName,
    discography,
    topTracks,
    remainingTracks,
    allTracks,
    stats,
    isCurrentTrack,
    isPlaying,
    handlers,
  } = useArtistScreen();

  // ── Stagger entrance for sections ──
  const sectionKeys = useMemo(
    () => ['topTracks', 'discography', 'bio', 'remainingTracks'],
    [],
  );
  const entrance = useAnimatedEntrance(4, {
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

  // ── Track row renderer for remaining tracks ──
  const renderRemainingTrack = useCallback(
    (track: typeof allTracks[number], idx: number) => {
      const isActive = isCurrentTrack(track.uri);
      const isTrackPlaying = isActive && isPlaying;

      return (
        <TouchableOpacity
          key={track.uri}
          style={[
            styles.remainingTrackRow,
            {
              backgroundColor: isActive
                ? 'rgba(201,168,76,0.06)'
                : 'transparent',
            },
          ]}
          activeOpacity={0.6}
          onPress={() =>
            handlers.playTrack({
              uri: track.uri,
              title: track.title,
              duration: track.duration,
            })
          }>
          {/* Number or playing indicator */}
          <View style={styles.numCol}>
            {isTrackPlaying ? (
              <AudioWaveform isPlaying={true} color="#C9A84C" size={16} barWidth={2} barGap={2} />
            ) : (
              <AppText variant="caption" color="tertiary">
                {idx + 6}
              </AppText>
            )}
          </View>

          {/* Track info */}
          <View style={styles.remainingTrackInfo}>
            <AppText
              variant="body2"
              color={isActive ? 'accent' : 'primary'}
              numberOfLines={1}>
              {track.title}
            </AppText>
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {track.album}
            </AppText>
          </View>

          {/* Duration */}
          <AppText variant="caption" color="tertiary" style={styles.remainingDuration}>
            {formatDuration(track.duration)}
          </AppText>
        </TouchableOpacity>
      );
    },
    [isCurrentTrack, isPlaying, handlers],
  );

  // ── Styles ──
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        backBtn: {
          width: BACK_BTN_SIZE,
          height: BACK_BTN_SIZE,
          borderRadius: BACK_BTN_SIZE / 2,
          backgroundColor: colors.background.glass,
          alignItems: 'center',
          justifyContent: 'center',
        },
        backBtnElevated: {
          backgroundColor: colors.background.elevated,
        },
        topSectionDivider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
        },
        bottomDivider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* Background gradient */}
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* ── Back button (fixed, overlaid) ── */}
      <View style={[styles.backBtnContainer, {top: insets.top + 8}]}>
        <TouchableOpacity
          style={dynamicStyles.backBtn}
          onPress={handlers.goBack}
          activeOpacity={0.7}>
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
        {/* ── Artist Header (parallax) ── */}
        <ArtistHeader
          artistName={artistName}
          albumCount={stats.albumCount}
          trackCount={stats.trackCount}
          scrollY={scrollY}
          parallaxHeight={HEADER_HEIGHT}
        />

        {/* ── Action row: Play All / Shuffle ── */}
        <Animated.View style={[styles.actionRow, entrance.styles[0]]}>
          <AppButton
            title="Play All"
            variant="primary"
            size="md"
            onPress={handlers.playAll}
            style={styles.actionBtn}
            icon={
              <SvgIcon
                name="play"
                size={16}
                color={colors.text.primary}
              />
            }
          />
          <AppButton
            title="Shuffle"
            variant="secondary"
            size="md"
            onPress={handlers.shuffleAll}
            style={styles.actionBtn}
            icon={
              <SvgIcon
                name="shuffle"
                size={16}
                color={colors.accent.gold}
              />
            }
          />
        </Animated.View>

        {/* ── Top Tracks (entrance 1) ── */}
        <Animated.View style={entrance.styles[1]}>
          <ArtistTopTracks
            tracks={topTracks}
            isCurrentTrack={isCurrentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlers.playTrack}
            onSeeAll={handlers.seeAllTracks}
            remainingCount={remainingTracks.length}
          />
        </Animated.View>

        {/* ── Divider before discography ── */}
        <View style={dynamicStyles.topSectionDivider} />

        {/* ── Discography (entrance 2) ── */}
        <Animated.View style={entrance.styles[2]}>
          <ArtistDiscography
            albums={discography}
            onAlbumPress={handlers.navigateToAlbum}
          />
        </Animated.View>

        {/* ── Bio (entrance 3) ── */}
        <Animated.View style={entrance.styles[3]}>
          <ArtistBio bio="" />
        </Animated.View>

        {/* ── Remaining tracks (if any) ── */}
        {remainingTracks.length > 0 && (
          <View style={styles.remainingSection}>
            <View style={styles.remainingHeader}>
              <AppText variant="h3" color="primary">
                All Tracks
              </AppText>
              <AppText variant="caption" color="tertiary">
                {allTracks.length} tracks
              </AppText>
            </View>
            {remainingTracks.map((track, idx) =>
              renderRemainingTrack(track, idx),
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {allTracks.length === 0 && (
          <View style={styles.emptyState}>
            <AppText variant="body2" color="tertiary" style={styles.emptyText}>
              No tracks found for this artist.
            </AppText>
          </View>
        )}
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
  scrollContent: {
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  topSectionDivider: {},
  bottomDivider: {},
  remainingSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  remainingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  remainingTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  numCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingTrackInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  remainingDuration: {
    minWidth: 40,
    textAlign: 'right',
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
