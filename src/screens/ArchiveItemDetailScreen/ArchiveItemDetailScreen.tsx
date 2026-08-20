// ─── Archive Item Detail Screen ────────────────────────────────────────
// Phase 37.5/37.6: Internet Archive audio item hero + ordered track list.
// Tap a track → AudioPlayer with the full track list (EOF auto-advance,
// cross-track resume via recents). Long-press → queue / playlist /
// bookmark / share. Video items live on MovieDetail (existing screen).

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, View, ScrollView, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {ArchiveItemDetailScreenProps} from '../../navigation/types';
import {useArchiveItemDetailScreen} from './hooks/useArchiveItemDetailScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import FastImage from 'react-native-fast-image';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useAppDispatch} from '../../store';
import {useRecentHistory} from '../../features/recentHistory';
import {usePlaybackCommands} from '../../modules/playback';

import {prependToQueue, addToQueue} from '../../store/slices/playerSlice';
import {useBookmarks} from '../../features/bookmarks';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {shareContent} from '../../services/shareService';
import type {ArchiveTrack} from '../../types/api';
import type {MediaSource} from '../../types/media';

type Props = ArchiveItemDetailScreenProps;

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '--:--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const ArchiveItemDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {identifier, title: routeTitle} = route.params;
  const {item, tracks, isLoading, error, retry} =
    useArchiveItemDetailScreen(identifier);
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const haptics = useHaptics();
    const {add: addBookmark} = useBookmarks();
  const {openPlayer} = usePlaybackCommands();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [menuTrack, setMenuTrack] = useState<ArchiveTrack | null>(null);
  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<{
    fileUri: string;
    title: string;
    duration: number;
    artist?: string;
    thumbnailPath?: string;
    source?: MediaSource;
    provider?: string;
    type?: 'archive-audio' | 'archive-video';
    mediaType?: 'audio' | 'video';
  } | null>(null);

  const title = item?.title || routeTitle || 'Archive Item';
  const imageUrl = item?.imageUrl ?? '';

  // ── Per-track progress from session recents (P37.5) ──
  const {list: sessionRecent} = useRecentHistory();
  const trackProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of sessionRecent) {
      if (r.duration > 0) {
        map[r.fileUri] = Math.min(1, r.position / r.duration);
      }
    }
    return map;
  }, [sessionRecent]);

  const handleTrackPress = useCallback(
    (track: ArchiveTrack, index: number) => {
      const list = tracks.map(t => ({
        uri: t.url,
        title: t.title,
        duration: t.lengthSeconds || undefined,
      }));
      openPlayer({
        uri: track.url,
        title: track.title,
        duration: track.lengthSeconds || 0,
        artworkUri: imageUrl || undefined,
        source: 'api',
        type: 'archive-audio',
        mediaType: 'audio',
        provider: 'internet-archive',
        chapterList: list,
        chapterIndex: index,
      });
    },
    [openPlayer, tracks, imageUrl],
  );

  // P37.6: long-press → play next / queue / playlist / bookmark / share
  const handleTrackLongPress = useCallback((track: ArchiveTrack) => {
    setMenuTrack(track);
    setTrackMenuVisible(true);
  }, []);

  const handleTrackMenuSelect = useCallback(
    (value: string | number) => {
      const track = menuTrack;
      if (!track) return;
      switch (value) {
        case 'play-next':
          dispatch(
            prependToQueue({
              uri: track.url,
              title: track.title,
              duration: track.lengthSeconds,
              source: 'api',
            provider: 'internetArchive',
              mediaType: 'audio',
            }),
          );
          toast.show('Playing next');
          break;
        case 'add-queue':
          dispatch(
            addToQueue({
              uri: track.url,
              title: track.title,
              duration: track.lengthSeconds,
              source: 'api',
            provider: 'internetArchive',
              mediaType: 'audio',
            }),
          );
          toast.show('Added to queue');
          break;
        case 'add-playlist':
          setSheetItem({
            fileUri: track.url,
            title: track.title,
            duration: track.lengthSeconds,
            artist: item?.creator,
            thumbnailPath: imageUrl || undefined,
            source: 'api',
            provider: 'internetArchive',
            mediaType: 'audio',
          });
          break;
        case 'bookmark': {
          const input = {
            fileUri: track.url,
            title: track.title,
            position: 0,
            duration: track.lengthSeconds,
            label: '',
            thumbnailPath: imageUrl || undefined,
            mediaType: 'audio' as const,
            source: 'api' as const,
            provider: 'internetArchive',
            type: 'archive-audio' as const,
          };
          const result = addBookmark(input);
          if (result.status === 'requires-confirmation') {
            Alert.alert(
              'Bookmark limit reached',
              `Adding “${track.title}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Remove & Add',
                  style: 'destructive',
                  onPress: () => addBookmark(result.requested, {evictId: result.candidate.id}),
                },
              ],
            );
          } else {
            toast.show('Bookmarked track');
          }
          break;
        }
        case 'share':
          shareContent({
            route: 'AudioPlayer',
            params: {
              fileUri: track.url,
              fileTitle: track.title,
              source: 'api',
            provider: 'internetArchive',
            },
            title: track.title,
            subtitle: item?.creator,
          });
          break;
      }
      setMenuTrack(null);
      haptics.light();
    },
    [menuTrack, item, imageUrl, dispatch, toast, addBookmark, haptics],
  );

  const handleShare = useCallback(() => {
    shareContent({
      route: 'ArchiveItemDetail',
      params: {identifier},
      title,
    });
  }, [identifier, title]);

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

  // ── Loading State ──
  if (isLoading) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <Placeholder variant="loading" anchor="center" title="Loading item…" />
      </View>
    );
  }

  // ── Error State ──
  // Failures surface as a top-of-screen toast with a Retry action (see
  // useEffect above). The header stays so the user can navigate back; the
  // body shows a minimal placeholder rather than a giant error card.
  if (error || !item) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <Placeholder
          variant="empty"
          anchor="center"
          icon="headphones"
          title={error ?? 'Item not found'}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <InternalHeader
        title={title}
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
              <SvgIcon name="headphones" size={48} color={colors.accent.gold} />
            </View>
          )}

          <AppText variant="displaySerif" color="primary" style={styles.itemTitle}>
            {item.title}
          </AppText>

          {item.creator ? (
            <AppText variant="body1" color="secondary" style={styles.creatorText}>
              {item.creator}
            </AppText>
          ) : null}

          {item.description ? (
            <>
              <AppText
                variant="bodySmall"
                color="tertiary"
                style={styles.descriptionText}
                numberOfLines={isDescriptionExpanded ? undefined : 2}>
                {item.description.replace(/<[^>]*>/g, '')}
              </AppText>
              <TouchableOpacity
                style={styles.showMoreButton}
                activeOpacity={0.7}
                onPress={() => setIsDescriptionExpanded(prev => !prev)}
                accessibilityRole="button">
                <AppText variant="caption" color="accent" style={styles.showMoreLabel}>
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </AppText>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.metaRow}>
            {item.year ? (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <SvgIcon name="speed" size={14} color={colors.accent.gold} />
                <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                  {item.year}
                </AppText>
              </View>
            ) : null}
            <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="listMusic" size={14} color={colors.accent.gold} />
              <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Tracks List ── */}
        <View style={styles.tracksSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="displaySans" color="primary">
              Tracks
            </AppText>
            <AppText variant="caption" color="tertiary">
              {tracks.length} available
            </AppText>
          </View>

          {tracks.length === 0 && (
            <AppText variant="body2" color="tertiary" style={styles.noTracks}>
              No streamable tracks found for this item.
            </AppText>
          )}

          <FlatList
            data={tracks}
            keyExtractor={(track, index) => `${track.url}-${index}`}
            renderItem={({item: track, index}) => {
            const pct = trackProgress[track.url];
            return (
              <TouchableOpacity
                style={[styles.trackCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
                activeOpacity={0.7}
                onPress={() => handleTrackPress(track, index)}
                onLongPress={() => handleTrackLongPress(track)}
                delayLongPress={400}
                accessibilityRole="button">
                <View style={styles.trackInfo}>
                  <AppText
                    variant="body2"
                    color="primary"
                    style={styles.trackTitle}
                    numberOfLines={1}>
                    {index + 1}. {track.title}
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    {formatTime(track.lengthSeconds)}
                  </AppText>
                  {pct !== undefined ? (
                    pct >= 0.95 ? (
                      <AppText variant="caption" style={[styles.playedText, {color: colors.accent.gold}]}>
                        Finished
                      </AppText>
                    ) : (
                      <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
                        <View
                          style={[
                            styles.progressFill,
                            {width: `${Math.round(pct * 100)}%`, backgroundColor: colors.accent.gold},
                          ]}
                        />
                      </View>
                    )
                  ) : null}
                </View>
                <View style={[styles.playButton, {backgroundColor: colors.accent.goldDim}]}>
                  <SvgIcon name="play" size={20} color={colors.accent.gold} />
                </View>
              </TouchableOpacity>
            );
            }}
            scrollEnabled={false}
            initialNumToRender={tracks.length}
          />
        </View>
      </ScrollView>

      {/* 58.4/58.5: one bottom-sheet menu — same actions as before */}
      <MediaActionsSheet
        visible={trackMenuVisible}
        onClose={() => setTrackMenuVisible(false)}
        title={menuTrack?.title ?? 'Track Options'}
        subtitle={item?.creator}
        actions={[
          {
            label: 'Play Next',
            icon: 'skipForward',
            onPress: () => handleTrackMenuSelect('play-next'),
          },
          {
            label: 'Add to Queue',
            icon: 'list',
            onPress: () => handleTrackMenuSelect('add-queue'),
          },
          {
            label: 'Add to Playlist',
            icon: 'listMusic',
            onPress: () => handleTrackMenuSelect('add-playlist'),
          },
          {
            label: 'Bookmark',
            icon: 'bookmark',
            onPress: () => handleTrackMenuSelect('bookmark'),
          },
          {
            label: 'Share',
            icon: 'share',
            onPress: () => handleTrackMenuSelect('share'),
          },
        ]}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // (Replaced by the shared <Placeholder> component.)
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // ── Hero ──
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroImage: {
    width: 140,
    height: 140,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  itemTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  creatorText: {
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  metaBadgeText: {
    fontWeight: '700',
  },
  // ── Tracks ──
  tracksSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  noTracks: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  trackCard: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  trackInfo: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2,
  },
  trackTitle: {
    marginBottom: 2,
  },
  playedText: {
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
