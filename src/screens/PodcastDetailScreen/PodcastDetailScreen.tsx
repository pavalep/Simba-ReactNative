import React, {useState, useMemo, useCallback} from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {PodcastDetailScreenProps} from '../../navigation/types';
import type {PodcastEpisodeResult} from '../../types/api';
import {usePodcastDetailScreen} from './hooks/usePodcastDetailScreen';

type Props = PodcastDetailScreenProps;

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0min';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}min`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export const PodcastDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const {podcastId, podcastTitle: paramTitle} = route.params;
  const {podcast, episodes, isLoading, error} =
    usePodcastDetailScreen(podcastId);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const title = podcast?.title ?? paramTitle ?? 'Podcast';

  const handleEpisodePress = useCallback(
    (episode: PodcastEpisodeResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: episode.enclosureUrl,
        fileTitle: episode.title,
      });
    },
    [navigation],
  );

  const handleRetry = useCallback(() => {
    // Re-trigger by navigating back and forth — the hook re-fetches on mount.
    // We simply trigger a re-render by toggling a state if needed, but the hook
    // already runs the effect on mount. The user can go back and re-enter.
    navigation.replace('PodcastDetail', {podcastId, podcastTitle: paramTitle});
  }, [navigation, podcastId, paramTitle]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          paddingBottom: 40,
        },
        // ── Hero ──
        heroSection: {
          alignItems: 'center',
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
        },
        imagePlaceholder: {
          width: 120,
          height: 120,
          borderRadius: radius.lg,
          backgroundColor: colors.accent.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        },
        podcastTitle: {
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        authorText: {
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        descriptionText: {
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        showMoreButton: {
          paddingVertical: spacing.xs,
          marginBottom: spacing.md,
        },
        showMoreLabel: {
          textAlign: 'center',
        },
        episodeCountBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.accent.goldDim,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          gap: spacing.xs,
        },
        episodeCountText: {
          color: colors.accent.gold,
        },
        // ── Episodes Section ──
        episodesSection: {
          paddingHorizontal: spacing.lg,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        episodeCard: {
          flexDirection: 'row',
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        episodeInfo: {
          flex: 1,
          marginRight: spacing.sm,
        },
        episodeTitle: {
          marginBottom: 2,
        },
        episodeMeta: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.xs,
          marginBottom: spacing.xs,
        },
        episodeDescription: {
          marginTop: spacing.xs,
        },
        playButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        },
        // ── Loading ──
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // ── Error ──
        errorContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
        },
        errorText: {
          textAlign: 'center',
          marginBottom: spacing.lg,
        },
        retryButton: {
          backgroundColor: colors.accent.goldDim,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
        },
        retryText: {
          color: colors.accent.gold,
        },
      }),
    [colors],
  );

  // ── Loading State ──
  if (isLoading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <View style={styles.loadingContainer}>
          <ActivityOrb size={48} />
        </View>
      </View>
    );
  }

  // ── Error State ──
  if (error || !podcast) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <View style={styles.errorContainer}>
          <AppText variant="body1" color="error" style={styles.errorText}>
            {error ?? 'Podcast not found'}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.7}
            onPress={handleRetry}
            accessibilityLabel="Retry loading podcast"
            accessibilityRole="button">
            <AppText variant="button" style={styles.retryText}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title={title} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ── Hero Section ── */}
        <View style={styles.heroSection}>
          <View style={styles.imagePlaceholder}>
            <SvgIcon name="music" size={48} color={colors.accent.gold} />
          </View>

          <AppText variant="h2" color="primary" style={styles.podcastTitle}>
            {podcast.title}
          </AppText>

          <AppText variant="body1" color="secondary" style={styles.authorText}>
            {podcast.author}
          </AppText>

          {podcast.description ? (
            <>
              <AppText
                variant="bodySmall"
                color="tertiary"
                style={styles.descriptionText}
                numberOfLines={isDescriptionExpanded ? undefined : 2}>
                {podcast.description}
              </AppText>
              <TouchableOpacity
                style={styles.showMoreButton}
                activeOpacity={0.7}
                onPress={() =>
                  setIsDescriptionExpanded(prev => !prev)
                }
                accessibilityLabel={
                  isDescriptionExpanded ? 'Show less' : 'Show more'
                }
                accessibilityRole="button">
                <AppText
                  variant="caption"
                  color="accent"
                  style={styles.showMoreLabel}>
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </AppText>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.episodeCountBadge}>
            <SvgIcon name="music" size={14} color={colors.accent.gold} />
            <AppText
              variant="caption"
              style={styles.episodeCountText}>
              {podcast.episodeCount} episode
              {podcast.episodeCount !== 1 ? 's' : ''}
            </AppText>
          </View>
        </View>

        {/* ── Episodes List ── */}
        <View style={styles.episodesSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3" color="primary">
              Episodes
            </AppText>
            <AppText variant="caption" color="tertiary">
              {episodes.length} available
            </AppText>
          </View>

          {episodes.map(episode => (
            <TouchableOpacity
              key={episode.id}
              style={styles.episodeCard}
              activeOpacity={0.7}
              onPress={() => handleEpisodePress(episode)}
              accessibilityLabel={`Play episode ${episode.title}`}
              accessibilityRole="button">
              <View style={styles.episodeInfo}>
                <AppText
                  variant="body2"
                  color="primary"
                  style={styles.episodeTitle}
                  numberOfLines={1}>
                  {episode.title}
                </AppText>

                <View style={styles.episodeMeta}>
                  <AppText variant="caption" color="tertiary">
                    {formatDate(episode.datePublished)}
                  </AppText>
                  {episode.duration > 0 && (
                    <>
                      <AppText variant="caption" color="tertiary">
                        •
                      </AppText>
                      <AppText variant="caption" color="tertiary">
                        {formatDuration(episode.duration)}
                      </AppText>
                    </>
                  )}
                </View>

                {episode.description ? (
                  <AppText
                    variant="caption"
                    color="secondary"
                    style={styles.episodeDescription}
                    numberOfLines={2}>
                    {episode.description.replace(/<[^>]*>/g, '')}
                  </AppText>
                ) : null}
              </View>

              <View style={styles.playButton}>
                <SvgIcon name="play" size={20} color={colors.accent.gold} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
