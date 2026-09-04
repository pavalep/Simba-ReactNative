// ─── Audiobook Detail Screen ───────────────────────────────────────────
// Phase 37.2/37.3/37.6: book hero + ordered chapter list from the IA
// metadata. Tap a chapter → AudioPlayer with the full chapter list so
// EOF auto-advances to the next chapter. Per-chapter progress comes
// from session recents (keyed by chapter URL). Long-press → queue /
// playlist / bookmark / share.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, View, ScrollView, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import type {AudiobookDetailScreenProps} from '../../../navigation/types';
import {useAudiobookDetailScreen} from '../hooks/useAudiobookDetailScreen';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../../components/feedback/Placeholder';
import FastImage from 'react-native-fast-image';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useRecentHistory} from '../../../features/recentHistory';
import { resolveStreamType, usePlayerActivity, useQueue } from '@simba-dev/react-native-media-player';

import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {shareContent} from '../../../services/shareService';
import {
  archiveImageUrl,
  archiveIdentifierFromUrl,
} from '../../../services/api/internetArchiveService';
import type {ArchiveTrack} from '../../../types/api';
import type {MediaSource} from '../../../types/media';

type Props = AudiobookDetailScreenProps;

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

export const AudiobookDetailScreen: React.FC<Props> = ({route}) => {
  const {bookId, bookTitle: paramTitle} = route.params;
  const {book, chapters, isLoading, error, retry} =
    useAudiobookDetailScreen(bookId);
  const {colors} = useTheme();
  const {addToQueue, prependToQueue} = useQueue();
  const toast = useToast();
  const haptics = useHaptics();
    const {add: addBookmark} = useBookmarks();
  const {openPlayer} = usePlayerActivity();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [menuChapter, setMenuChapter] = useState<ArchiveTrack | null>(null);
  const [chapterMenuVisible, setChapterMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<{
    fileUri: string;
    title: string;
    duration: number;
    artist?: string;
    thumbnailPath?: string;
    source?: MediaSource;
    provider?: string;
    type?: 'audiobook';
    mediaType?: 'audio' | 'video';
  } | null>(null);

  const title = book?.title || paramTitle || 'Audiobook';
  const coverImage = book
    ? (() => {
        const identifier = archiveIdentifierFromUrl(book.urlIArchive);
        return identifier ? archiveImageUrl(identifier) : '';
      })()
    : '';

  // ── Per-chapter progress from session recents (P37.3) ──
  const {list: sessionRecent} = useRecentHistory();
  const chapterProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of sessionRecent) {
      if (r.duration > 0) {
        map[r.fileUri] = Math.min(1, r.position / r.duration);
      }
    }
    return map;
  }, [sessionRecent]);

  const handleChapterPress = useCallback(
    (chapter: ArchiveTrack, index: number) => {
      if (!book) return;
      const list = chapters.map(c => ({
        uri: c.url,
        title: c.title,
        duration: c.lengthSeconds || undefined,
      }));
      openPlayer({
        uri: chapter.url,
        title: chapter.title,
        type: 'audio',
      });
    },
    [openPlayer, book, chapters, coverImage],
  );

  // P37.6: long-press → play next / queue / playlist / bookmark / share
  const handleChapterLongPress = useCallback((chapter: ArchiveTrack) => {
    setMenuChapter(chapter);
    setChapterMenuVisible(true);
  }, []);

  const handleChapterMenuSelect = useCallback(
    (value: string | number) => {
      const chapter = menuChapter;
      if (!chapter) return;
      switch (value) {
        case 'play-next':
          prependToQueue({
            uri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            source: 'api',
            provider: 'librivox',
            type: 'audio',
            mediaType: 'audio',
          });
          toast.show('Playing next');
          break;
        case 'add-queue':
          addToQueue({
            uri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            source: 'api',
            provider: 'librivox',
            type: 'audio',
            mediaType: 'audio',
          });
          toast.show('Added to queue');
          break;
        case 'add-playlist':
          setSheetItem({
            fileUri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            artist: book?.author,
            thumbnailPath: coverImage || undefined,
            source: 'api',
            provider: 'librivox',
            type: 'audiobook',
            mediaType: 'audio',
          });
          break;
        case 'bookmark': {
          const input = {
            fileUri: chapter.url,
            title: chapter.title,
            position: 0,
            duration: chapter.lengthSeconds,
            label: '',
            thumbnailPath: coverImage || undefined,
            mediaType: 'audio' as const,
            source: 'api' as const,
            provider: 'librivox',
            type: 'audiobook' as const,
          };
          const result = addBookmark(input);
          if (result.status === 'requires-confirmation') {
            Alert.alert(
              'Bookmark limit reached',
              `Adding “${chapter.title}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
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
            toast.show('Bookmarked chapter');
          }
          break;
        }
        case 'share':
          shareContent({
            route: 'AudiobookDetail',
            params: {
              bookId,
              bookTitle: title,
            },
            title: chapter.title,
            subtitle: book?.author,
          });
          break;
      }
      setMenuChapter(null);
      haptics.light();
    },
    [menuChapter, book, bookId, title, coverImage, toast, addBookmark, haptics, addToQueue, prependToQueue],
  );

  const handleShare = useCallback(() => {
    shareContent({
      route: 'AudiobookDetail',
      params: {bookId},
      title,
    });
  }, [bookId, title]);

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
        <Placeholder variant="loading" anchor="center" title="Loading audiobook…" />
      </View>
    );
  }

  // ── Error State ──
  // Failures surface via toast (see useEffect above). The header stays so
  // the user can navigate back; the body shows a minimal placeholder.
  if (error || !book) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <Placeholder
          variant="empty"
          anchor="center"
          icon="music"
          title={error ?? 'Audiobook not found'}
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
          {coverImage ? (
            <FastImage
              source={{uri: coverImage}}
              style={styles.heroImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.imagePlaceholder, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="music" size={48} color={colors.accent.gold} />
            </View>
          )}

          <AppText variant="displaySerif" color="primary" style={styles.bookTitle}>
            {book.title}
          </AppText>

          <AppText variant="body1" color="secondary" style={styles.authorText}>
            {book.author}
          </AppText>

          {book.description ? (
            <>
              <AppText
                variant="bodySmall"
                color="tertiary"
                style={styles.descriptionText}
                numberOfLines={isDescriptionExpanded ? undefined : 2}>
                {book.description.replace(/<[^>]*>/g, '')}
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
            {book.totalTime > 0 && (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <SvgIcon name="speed" size={14} color={colors.accent.gold} />
                <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                  {formatTime(book.totalTime)}
                </AppText>
              </View>
            )}
            {book.language && (
              <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                <SvgIcon name="subtitles" size={14} color={colors.accent.gold} />
                <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                  {book.language}
                </AppText>
              </View>
            )}
            <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="listMusic" size={14} color={colors.accent.gold} />
              <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Chapters List ── */}
        <View style={styles.chaptersSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="displaySans" color="primary">
              Chapters
            </AppText>
            <AppText variant="caption" color="tertiary">
              {chapters.length} available
            </AppText>
          </View>

          {chapters.length === 0 && (
            <AppText variant="body2" color="tertiary" style={styles.noChapters}>
              No streamable chapters found for this book.
            </AppText>
          )}

          <FlatList
            data={chapters}
            keyExtractor={(chapter, index) => `${chapter.url}-${index}`}
            renderItem={({item: chapter, index}) => {
            const pct = chapterProgress[chapter.url];
            return (
              <TouchableOpacity
                style={[styles.chapterCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
                activeOpacity={0.7}
                onPress={() => handleChapterPress(chapter, index)}
                onLongPress={() => handleChapterLongPress(chapter)}
                delayLongPress={400}
                accessibilityRole="button">
                <View style={styles.chapterInfo}>
                  <AppText
                    variant="body2"
                    color="primary"
                    style={styles.chapterTitle}
                    numberOfLines={1}>
                    {index + 1}. {chapter.title}
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    {formatTime(chapter.lengthSeconds)}
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
            initialNumToRender={chapters.length}
          />
        </View>
      </ScrollView>

      {/* 58.4/58.5: one bottom-sheet menu — same actions as before */}
      <MediaActionsSheet
        visible={chapterMenuVisible}
        onClose={() => setChapterMenuVisible(false)}
        title={menuChapter?.title ?? 'Chapter Options'}
        subtitle={book?.author}
        actions={[
          {
            label: 'Play Next',
            icon: 'skipForward',
            onPress: () => handleChapterMenuSelect('play-next'),
          },
          {
            label: 'Add to Queue',
            icon: 'list',
            onPress: () => handleChapterMenuSelect('add-queue'),
          },
          {
            label: 'Add to Playlist',
            icon: 'listMusic',
            onPress: () => handleChapterMenuSelect('add-playlist'),
          },
          {
            label: 'Bookmark',
            icon: 'bookmark',
            onPress: () => handleChapterMenuSelect('bookmark'),
          },
          {
            label: 'Share',
            icon: 'share',
            onPress: () => handleChapterMenuSelect('share'),
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
  bookTitle: {
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
  // ── Chapters ──
  chaptersSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  noChapters: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  chapterCard: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  chapterInfo: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2,
  },
  chapterTitle: {
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
