// ─── TV Show Detail Screen ─────────────────────────────────────────────
// Phase 38.2/38.4/38.5/38.6: poster + summary + seasons → episodes with
// air dates; local video files matched by filename play directly;
// themed placeholder when art is missing; show bookmarkable.

import React, {useCallback, useEffect, useState} from 'react';
import {Alert, View, ScrollView, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import type {ShowDetailScreenProps} from '../../../navigation/types';
import {useShowDetailScreen} from '../hooks/useShowDetailScreen';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../../components/feedback/Placeholder';
import FastImage from 'react-native-fast-image';
import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {shareContent} from '../../../services/shareService';
import {usePlayerActivity} from '@simba-dev/react-native-media-player';

type Props = ShowDetailScreenProps;

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

export const ShowDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {showId, showName} = route.params;
  const {show, seasons, matchedCount, isLoading, error, retry} =
    useShowDetailScreen(showId);
  const {colors} = useTheme();
  const {add: addBookmark} = useBookmarks();
  const toast = useToast();
  const haptics = useHaptics();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const imageUrl = show?.image?.original ?? show?.image?.medium ?? '';

  const handleBookmarkShow = useCallback(() => {
    if (!show) return;
    const input = {
      fileUri: `tvmaze://show/${show.id}`,
      title: show.name,
      position: 0,
      duration: 0,
      label: '',
      thumbnailPath: show.image?.medium || undefined,
      mediaType: 'video' as const,
      source: 'api' as const,
      provider: 'tvmaze',
      type: 'video' as const,
    };
    const result = addBookmark(input);
    if (result.status === 'requires-confirmation') {
      Alert.alert(
        'Bookmark limit reached',
        `Adding “${show.name}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove & Add',
            style: 'destructive',
            onPress: () => addBookmark(result.requested, {evictId: result.candidate.id}),
          },
        ],
      );
      return;
    }
    haptics.light();
    toast.show('Show bookmarked');
  }, [show, addBookmark, haptics, toast]);

  const handleShare = useCallback(() => {
    if (!show) return;
    shareContent({
      route: 'ShowDetail',
      params: {showId: show.id},
      title: show.name,
    });
  }, [show]);

    const {openPlayer} = usePlayerActivity();

  const handleEpisodePress = useCallback(

    (localUri: string, episode: {season: number; number: number; name: string}) => {
      openPlayer({
        uri: localUri,
        title: `${show?.name ?? showName ?? ''} S${String(episode.season).padStart(2, '0')}E${String(episode.number).padStart(2, '0')} — ${episode.name}`,
        type: 'video',
      });
    },
    [openPlayer, show?.name, showName],
  );

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  // Surface load failures as a top-of-screen toast with a Retry action.
  useEffect(() => {
    if (error) {
      toast.show(error, 'error', {
        duration: 8000,
        action: {label: 'Retry', onPress: handleRetry},
      });
    }
  }, [error, toast, handleRetry]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={showName ?? 'Show'} />
        <Placeholder variant="loading" anchor="center" title="Loading show…" />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={showName ?? 'Show'} />
        <Placeholder
          variant="empty"
          anchor="center"
          icon="video"
          title={error ?? 'Show not found'}
        />
      </View>
    );
  }

  const summary = stripHtml(show.summary);
  const metaParts: string[] = [];
  if (show.premiered) metaParts.push(show.premiered.slice(0, 4));
  if (show.network?.name) metaParts.push(show.network.name);
  if (show.runtime) metaParts.push(`${show.runtime} min`);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <InternalHeader
        title={show.name}
        rightAction={{icon: 'share', onPress: handleShare}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.heroSection}>
          {imageUrl ? (
            <FastImage
              source={{uri: imageUrl}}
              style={styles.heroImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.imagePlaceholder, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="video" size={48} color={colors.accent.gold} />
            </View>
          )}

          <AppText variant="displaySerif" color="primary" style={styles.showTitle}>
            {show.name}
          </AppText>

          {metaParts.length > 0 ? (
            <AppText variant="body1" color="secondary" style={styles.metaText}>
              {metaParts.join(' · ')}
            </AppText>
          ) : null}

          <View style={styles.badgeRow}>
            {show.status ? (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <AppText variant="caption" style={{color: colors.accent.gold}}>
                  {show.status}
                </AppText>
              </View>
            ) : null}
            {show.rating?.average ? (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <AppText variant="caption" style={{color: colors.accent.gold}}>
                  ★ {show.rating.average.toFixed(1)}
                </AppText>
              </View>
            ) : null}
            {show.genres?.length ? (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <AppText variant="caption" style={{color: colors.accent.gold}}>
                  {show.genres.slice(0, 3).join(', ')}
                </AppText>
              </View>
            ) : null}
          </View>

          {summary ? (
            <>
              <AppText
                variant="bodySmall"
                color="tertiary"
                numberOfLines={isSummaryExpanded ? undefined : 3}
                style={styles.summaryText}>
                {summary}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsSummaryExpanded(prev => !prev)}
                accessibilityRole="button">
                <AppText variant="caption" color="accent">
                  {isSummaryExpanded ? 'Show less' : 'Show more'}
                </AppText>
              </TouchableOpacity>
            </>
          ) : null}

          {matchedCount > 0 ? (
            <View style={[styles.matchedBanner, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="video" size={16} color={colors.accent.gold} />
              <AppText variant="caption" style={{color: colors.accent.gold}}>
                {matchedCount} episode{matchedCount === 1 ? '' : 's'} matched to your library
              </AppText>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.bookmarkButton, {backgroundColor: colors.accent.goldDim}]}
            activeOpacity={0.8}
            onPress={handleBookmarkShow}
            accessibilityRole="button">
            <SvgIcon name="bookmark" size={16} color={colors.accent.gold} />
            <AppText variant="button" style={{color: colors.accent.gold}}>
              Bookmark show
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Seasons → episodes (59.1: virtualized nested lists) ── */}
        <FlatList
          data={seasons}
          keyExtractor={season => `season-${season.season}`}
          renderItem={({item: season}) => (
            <View style={styles.seasonSection}>
              <AppText variant="body1" color="primary" style={styles.seasonTitle}>
                Season {season.season}
              </AppText>
              <FlatList
                data={season.items}
                keyExtractor={item => String(item.episode.id)}
                renderItem={({item}) => {
                  const ep = item.episode;
                  const epNumber = ep.number ?? 0;
                  const playable = item.localUri !== null;
                  return (
                    <TouchableOpacity
                      activeOpacity={playable ? 0.8 : 1}
                      disabled={!playable}
                      onPress={() => item.localUri && handleEpisodePress(item.localUri, ep)}
                      style={[
                        styles.episodeRow,
                        {backgroundColor: colors.background.elevated},
                        !playable && styles.episodeRowDisabled,
                      ]}
                      accessibilityRole={playable ? 'button' : undefined}>
                      <View
                        style={[
                          styles.episodeNumberBadge,
                          {backgroundColor: colors.accent.goldDim},
                        ]}>
                        <AppText
                          variant="caption"
                          style={[
                            styles.episodeNumberText,
                            {color: colors.accent.gold},
                          ]}>
                          {String(ep.season).padStart(2, '0')}×{String(epNumber).padStart(2, '0')}
                        </AppText>
                      </View>
                      <View style={styles.episodeInfo}>
                        <AppText variant="bodySmall" numberOfLines={1} style={styles.episodeTitle}>
                          {ep.name}
                        </AppText>
                        <AppText variant="caption" color="tertiary">
                          {ep.airdate
                            ? `${ep.airdate}${playable ? ' · local file' : ''}`
                            : playable
                              ? 'Local file'
                              : 'No local file'}
                        </AppText>
                      </View>
                      {playable ? (
                        <SvgIcon name="play" size={18} color={colors.accent.gold} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                scrollEnabled={false}
                initialNumToRender={season.items.length}
              />
            </View>
          )}
          scrollEnabled={false}
          initialNumToRender={seasons.length}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // (Replaced by the shared <Placeholder> component.)
  errorText: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 80,
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  heroImage: {
    width: 140,
    height: 200,
    borderRadius: radius.md,
    alignSelf: 'center',
  },
  imagePlaceholder: {
    width: 140,
    height: 200,
    borderRadius: radius.md,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showTitle: {
    textAlign: 'center',
    fontWeight: '700',
  },
  metaText: {
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  metaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  summaryText: {
    lineHeight: 18,
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  bookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  seasonSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  seasonTitle: {
    fontWeight: '700',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  episodeNumberBadge: {
    width: 44,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeNumberText: {
    fontWeight: '700',
  },
  episodeInfo: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    fontWeight: '600',
  },
  episodeRowDisabled: {
    opacity: 0.55,
  },
});
