// ─── Movie Detail Screen ─────────────────────────────────────────────────
// Shows detailed info about an Internet Archive movie.

import React, {useCallback} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {usePlaybackCommands} from '../../modules/playback';

import {RootStackScreenProps} from '../../navigation/types';
import {ScreenContainer} from '../../components/layout/ScreenContainer/ScreenContainer';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SimbaStatusBar} from '../../components/StatusBar';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {AppText} from '../../components/core/AppText/AppText';
import {Placeholder} from '../../components/feedback/Placeholder';
import {SvgIcon} from '../../components/utility/SvgIcon/SvgIcon';
import {useMovieDetailScreen} from './hooks/useMovieDetailScreen';
import {shareContent} from '../../services/shareService';

type Props = RootStackScreenProps<'MovieDetail'>;

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) {return '--:--';}
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractYear(yearStr: string): string {
  if (!yearStr) {return '';}
  // Try to extract a 4-digit year from any date string
  const match = yearStr.match(/\b(\d{4})\b/);
  return match ? match[1] : yearStr;
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// ─── Component ──────────────────────────────────────────────────────────
export const MovieDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {openPlayer} = usePlaybackCommands();
  const {identifier, title: routeTitle} = route.params;
  const {item, isLoading, error, retry} = useMovieDetailScreen(identifier);
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const heroHeight = SCREEN_WIDTH * (9 / 16);

  const displayTitle = item?.title || routeTitle || '';
  const year = item?.year ? extractYear(item.year) : '';
  const rating = item?.avgRating ?? 0;

  // 56.4: share the movie via deep link + https fallback
  const handleShare = useCallback(() => {
    shareContent({
      route: 'MovieDetail',
      params: {identifier},
      title: displayTitle || 'Movie',
    });
  }, [identifier, displayTitle]);

  // ── Loading State ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ScreenContainer header={<InternalHeader title={displayTitle} />}>
        <Placeholder variant="loading" anchor="center" title="Loading movie details…" />
      </ScreenContainer>
    );
  }

  // ── Error State ────────────────────────────────────────────────────

  if (error || !item) {
    return (
      <ScreenContainer header={<InternalHeader title={displayTitle} />}>
        <Placeholder
          variant="empty"
          anchor="center"
          icon="alertCircle"
          iconColor={colors.semantic.error}
          title={error || 'Unable to load movie details'}
        />
      </ScreenContainer>
    );
  }

  // ── Content State ──────────────────────────────────────────────────

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="modal" />

      {/* Header */}
      <InternalHeader
        title={displayTitle}
        rightAction={{icon: 'share', onPress: handleShare}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero Section ────────────────────────────────────────────── */}
        <View style={[styles.heroContainer, {height: heroHeight}]}>
          {/* Placeholder thumbnail */}
          <View
            style={[
              styles.heroPlaceholder,
              {backgroundColor: colors.background.elevated},
            ]}>
            <SvgIcon
              name="video"
              size={64}
              color={colors.text.tertiary}
            />
          </View>

          {/* Gradient overlay */}
          <View style={styles.heroOverlay}>
            <View
              style={[
                styles.heroOverlayGradient,
                {backgroundColor: colors.background.scrim},
              ]}
            />
            <View style={styles.heroTextContainer}>
              <AppText
                variant="displaySerif"
                color="primary"
                numberOfLines={2}
                style={styles.heroTitle}>
                {displayTitle}
              </AppText>
              {year ? (
                <AppText variant="body2" color="secondary">
                  {year}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Info Row ──────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          {item.duration > 0 && (
            <View
              style={[
                styles.badge,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText
                variant="caption"
                color="accent"
                style={styles.badgeText}>
                {formatDuration(item.duration)}
              </AppText>
            </View>
          )}

          {rating > 0 && (
            <View
              style={[
                styles.badge,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText
                variant="caption"
                color="accent"
                style={styles.badgeText}>
                ★ {rating.toFixed(1)}
              </AppText>
            </View>
          )}

          {year ? (
            <AppText variant="caption" color="tertiary">
              {year}
            </AppText>
          ) : null}
        </View>

        {/* ── Synopsis ──────────────────────────────────────────────── */}
        {item.description ? (
          <View style={styles.section}>
            <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
              SYNOPSIS
            </AppText>
            <AppText variant="body2" color="primary" style={styles.descriptionText}>
              {item.description}
            </AppText>
          </View>
        ) : null}

        {/* ── Creator ───────────────────────────────────────────────── */}
        {item.creator ? (
          <View style={styles.section}>
            <AppText variant="body2" color="secondary">
              By{' '}
              <AppText variant="body2" color="primary">
                {item.creator}
              </AppText>
            </AppText>
          </View>
        ) : null}

        {/* ── Subtitles Section ─────────────────────────────────────── */}
        {item.subtitles && item.subtitles.length > 0 && (
          <View style={styles.section}>
            <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
              SUBTITLES
            </AppText>
            {/* 59.1: virtualized subtitle chips */}
            <FlatList
              horizontal
              data={item.subtitles}
              keyExtractor={(sub, index) => `${sub.language}-${index}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({item: sub}) => (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.background.elevated,
                      borderColor: colors.border.subtle,
                    },
                  ]}>
                  <SvgIcon
                    name="listMusic"
                    size={14}
                    color={colors.accent.gold}
                    style={styles.chipIcon}
                  />
                  <AppText variant="caption" color="primary">
                    {sub.language}
                  </AppText>
                </View>
              )}
              initialNumToRender={Math.min(item.subtitles.length, 24)}
              windowSize={5}
              maxToRenderPerBatch={12}
            />
          </View>
        )}

        {/* ── Audio Tracks Section ──────────────────────────────────── */}
        {item.audioTracks && item.audioTracks.length > 0 && (
          <View style={styles.section}>
            <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
              AUDIO TRACKS
            </AppText>
            {/* 59.1: virtualized audio tracks */}
            <FlatList
              data={item.audioTracks}
              keyExtractor={(track, index) => `${track.name}-${index}`}
              renderItem={({item: track}) => (
                <View
                  style={[
                    styles.audioTrackRow,
                    {
                      backgroundColor: colors.background.elevated,
                      borderColor: colors.border.subtle,
                    },
                  ]}>
                  <SvgIcon
                    name="headphones"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <View style={styles.audioTrackInfo}>
                    <AppText variant="bodySmall" color="primary" numberOfLines={1}>
                      {track.name}
                    </AppText>
                    <AppText variant="caption" color="tertiary">
                      {track.format}
                    </AppText>
                  </View>
                </View>
              )}
              scrollEnabled={false}
              initialNumToRender={item.audioTracks.length}
            />
          </View>
        )}

        {/* ── Download Options ──────────────────────────────────────── */}
        {item.downloadUrls && item.downloadUrls.length > 0 && (
          <View style={styles.section}>
            <AppText variant="overline" color="secondary" style={styles.sectionLabel}>
              DOWNLOAD OPTIONS
            </AppText>
            {/* 59.1: virtualized download options */}
            <FlatList
              data={item.downloadUrls}
              keyExtractor={(dl, index) => `${dl.format}-${index}`}
              renderItem={({item: dl}) => (
                <View
                  style={[
                    styles.downloadRow,
                    {
                      backgroundColor: colors.background.elevated,
                      borderColor: colors.border.subtle,
                    },
                  ]}>
                  <SvgIcon
                    name="folder"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <AppText
                    variant="bodySmall"
                    color="primary"
                    style={styles.downloadFormat}>
                    {dl.format}
                  </AppText>
                  <AppText
                    variant="caption"
                    color="tertiary"
                    numberOfLines={1}
                    style={styles.downloadUrl}
                    ellipsizeMode="middle">
                    {dl.url}
                  </AppText>
                </View>
              )}
              scrollEnabled={false}
              initialNumToRender={item.downloadUrls.length}
            />
          </View>
        )}

        {/* ── Bottom Spacer for Play Button ─────────────────────────── */}
        <View style={{height: 80}} />
      </ScrollView>

      {/* ── Play Button (Fixed at bottom) ──────────────────────────── */}
      <View
        style={[
          styles.playButtonContainer,
          {
            backgroundColor: colors.background.primary,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.title}`}
          onPress={() => {
            openPlayer({
              uri: item.streamingUrl,
              title: item.title,
              duration: item.duration ?? 0,
              startPosition: 0,
              source: 'api',
              type: 'movie',
              mediaType: 'video',
              provider: 'movie',
            });
          }}
          style={[
            styles.playButton,
            {backgroundColor: colors.accent.gold},
          ]}>
          <SvgIcon
            name="play"
            size={22}
            color={colors.background.primary}
          />
          <AppText
            variant="button"
            style={{color: colors.background.primary, marginLeft: spacing.sm}}>
            Play
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  // (Replaced by the shared <Placeholder> component.)
  // Hero
  heroContainer: {
    width: '100%',
    position: 'relative',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  heroOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroTextContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontWeight: '600',
  },
  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  descriptionText: {
    lineHeight: 22,
  },
  // Chips
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  // Audio tracks
  audioTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  audioTrackInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  // Download
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  downloadFormat: {
    marginLeft: spacing.md,
    fontWeight: '600',
    minWidth: 60,
  },
  downloadUrl: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  // Play button
  playButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
});


export default MovieDetailScreen;
