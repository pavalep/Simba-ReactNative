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
import {MediaImage} from '../../../components/utility/MediaImage';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useRecentHistory} from '../../../features/recentHistory';
import {useOpenPlaylist} from '../../../infrastructure/player';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {usePlayerStore} from '../../../state/playerStore';
import type {PlaybackEntryInput} from '../../../types/playback';

import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {shareContent} from '../../../services/shareService';
import {
  archiveImageUrl,
  archiveIdentifierFromUrl,
} from '../../../infrastructure/api/internetArchive/adapter';
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

/**
 * What a chapter of an audiobook IS — ONE answer, in ONE place.
 *
 * A chapter is written to four different places: the run (the chapter
 * list the player advances through), the queue, a playlist, and a
 * bookmark. They used to disagree about what a chapter is — the run
 * and the queue wrote `type: 'audio'`, while the playlist and the
 * bookmark wrote `type: 'audiobook'` — so the history row for a
 * chapter said "Audio" while the bookmark row for the SAME chapter
 * said "Audiobook", and nothing in the app could tell an audiobook
 * chapter from a music track.
 *
 * The lane is derived from the kind by `normalizeMediaClassification`,
 * so declaring the kind is enough.
 */
const CHAPTER_CLASSIFICATION = {
  source: 'api',
  type: 'audiobook',
  mediaType: 'audio',
  provider: 'librivox',
} as const;

/**
 * The book's chapters as the app's run entries.
 *
 * The run is what the engine advances through, so this list is what
 * makes "EOF advances to the next chapter" true.
 */
function chapterRunEntries(
  chapters: ArchiveTrack[],
  author?: string,
): PlaybackEntryInput[] {
  return chapters.map(c => ({
    uri: c.url,
    title: c.title,
    duration: c.lengthSeconds || 0,
    ...(author ? {artist: author} : {}),
    ...CHAPTER_CLASSIFICATION,
  }));
}

export const AudiobookDetailScreen: React.FC<Props> = ({route}) => {
  const {bookId, bookTitle: paramTitle} = route.params;
  const {book, chapters, isLoading, error, retry} =
    useAudiobookDetailScreen(bookId);
  const {colors} = useTheme();
  const {playNext, addToQueue} = useQueueActions();
  const toast = useToast();
  const haptics = useHaptics();
    const {add: addBookmark} = useBookmarks();
  const {openPlaylist} = useOpenPlaylist();

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

  /**
   * Tap a chapter → play it, with the WHOLE BOOK behind it.
   *
   * ## What this used to do
   *
   * It built the chapter list (`chapters.map(...)`) and then **never
   * passed it anywhere**. The list was dead code, and this file's own
   * header claimed "Tap a chapter → AudioPlayer with the full chapter
   * list so EOF auto-advances to the next chapter" — which was not
   * true: the chapter played alone, and at the end of it the player
   * stopped.
   *
   * ## What it does now
   *
   * The chapter list IS the run — the same list the engine advances
   * through, exactly as the Album screen's track list and a user
   * playlist are (`loadPlaylistToPlayer` + `openPlaylist`). So:
   *
   *   - EOF advances to the next chapter, because the next chapter is
   *     the run's next entry and the lane handover opens it;
   *   - the "next" control is enabled and points at the next chapter,
   *     for the same reason;
   *   - the Queue screen's "Up Next" lists the rest of the book.
   *
   * The tapped chapter becomes the run's current entry, so the
   * transport's position, previous and next all agree with what the
   * user just tapped.
   */
  const handleChapterPress = useCallback(
    (chapter: ArchiveTrack, index: number) => {
      if (!book) return;
      const entries = chapterRunEntries(chapters, book.author);
      if (entries.length === 0) return;

      // The RUN is the book. `loadPlaylistToPlayer` sets the list and
      // points the run at its first entry; `playFromPlaylist` moves it
      // to the chapter the user tapped.
      usePlayerStore.getState().loadPlaylistToPlayer(entries);
      usePlayerStore.getState().playFromPlaylist(index);

      openPlaylist(entries, {
        type: 'audio',
        startIndex: index,
        startExtras: {
          // The KIND, not just the stream type.
          //
          // `type` is the bridge's `'video' | 'audio'` stream type; the
          // catalogue kind travels as `mediaKind`, and the launch seam
          // records `mediaKind ?? bridgeOpts.type` on the session
          // (`src/infrastructure/player/useResumeAwareLaunch.ts`).
          // Without it the chapter was written to the playback history
          // as a generic AUDIO item — while THIS SAME file already
          // writes the chapter's BOOKMARK with `type: 'audiobook'` (and
          // its playlist entry likewise), so the history row and the
          // bookmark row disagreed about what a chapter is, and nothing
          // in the app could tell an audiobook chapter from a music
          // track.
          type: 'audiobook',
          mediaType: 'audio',
          provider: 'librivox',
          // The BOOK's cover as the launch artwork: the chapter IS the
          // book, so the history row shows the book's cover instead of
          // nothing. The seam forwards it to the bridge as the media
          // notification's artwork and stores it on the session, which
          // is what the checkpoint writer copies into the history row.
          ...(coverImage ? {thumbnailPath: coverImage} : {}),
        },
      });
    },
    [openPlaylist, book, chapters, coverImage],
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
          // The app's ONE queue action: the store call AND the toast (with
          // its Undo) belong to the wrapper, so a queue action here cannot
          // drift from a queue action anywhere else.
          playNext({
            uri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            ...CHAPTER_CLASSIFICATION,
          });
          break;
        case 'add-queue':
          addToQueue({
            uri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            ...CHAPTER_CLASSIFICATION,
          });
          break;
        case 'add-playlist':
          setSheetItem({
            fileUri: chapter.url,
            title: chapter.title,
            duration: chapter.lengthSeconds,
            artist: book?.author,
            thumbnailPath: coverImage || undefined,
            ...CHAPTER_CLASSIFICATION,
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
            ...CHAPTER_CLASSIFICATION,
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
    [menuChapter, book, bookId, title, coverImage, toast, addBookmark, haptics, addToQueue, playNext],
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
            <MediaImage
              source={coverImage}
              style={styles.heroImage}
              resizeMode="cover"
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
