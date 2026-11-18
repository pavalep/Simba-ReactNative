// ══════════════════════════════════════════════════════════════════
// Music Detail — the TRACK'S OWN PAGE
// ══════════════════════════════════════════════════════════════════
//
// The Music row used to BE the play action: one tap played the track
// from the list. The track's own page is now a real page (B13-9), so
// the row OPENS it and the play action lives here — the same grammar
// the Movie detail and the Podcast detail use.
//
// THE GRAMMAR IT FOLLOWS
// ----------------------
// The Movie detail's: an `InternalHeader` with the item's title and a
// share action, the artwork hero, a row of gold-dim badges, the
// action buttons, and a section below. The Podcast detail's: ONE
// scrollable, with the states inside it.
//
// WHAT THE OLD SCREEN GOT WRONG (B13-10 — six defects, all real)
// --------------------------------------------------------------
//   M-07  four bare `fontWeight` props — the weight now lives in the
//         family key, like every other style in the app.
//   M-09  hand-rolled loading and error states — they are the shared
//         `Placeholder` now, like every other screen.
//   M-11  the title was drawn THREE times: the header, the cover's
//         scrim and the info block. It is drawn TWICE now, exactly
//         like the Movie detail (the header and the hero).
//   M-12  a `FlatList` inside a `ScrollView` — the page is ONE list
//         now, with the hero as its header and the states as its
//         empty component.
//   M-13  the launch was the pre-V21 `openPlayer`, not awaited — the
//         typed `usePlay()` facade is, so a refused launch says why.
//   M-28  `source` sat in the play handler's deps without being read.
//
// The share action is the header's (the Movie detail's treatment); the
// old screen had it as a third button in the actions block, which made
// three buttons for two actions.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {ScreenContainer} from '../../../components/layout/ScreenContainer/ScreenContainer';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import {SimbaStatusBar} from '../../../components/StatusBar';
import type {MusicDetailScreenProps} from '../../../navigation/types';
import {useMusicDetailScreen} from '../hooks/useMusicDetailScreen';
import {useMoreFromArtist} from '../../../hooks/useMoreFromArtist';
import {StreamingRow} from '../../../components/media/StreamingRow/StreamingRow';
import type {JamendoTrackResult, AudiusTrackResult} from '../../../types/api';
import {shareContent} from '../../../services/shareService';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {
  isBlockedError,
  isExpiredError,
  isLaunchError,
  isNetworkError,
  isUnsupportedError,
  usePlay,
} from '../../../infrastructure/player';
import {formatDuration} from '../../../utils/timeAgo';

type Props = MusicDetailScreenProps;

export const MusicDetailScreen: React.FC<Props> = ({route}) => {
  const {trackId, source = 'jamendo'} = route.params;
  const {track, isLoading, error} = useMusicDetailScreen(trackId, source);
  const {colors} = useTheme();
  const play = usePlay();
  const toast = useToast();
  // P34.1: add-to-playlist sheet for streaming tracks
  const [sheetVisible, setSheetVisible] = useState(false);

  const imageUrl = track
    ? 'imageUrl' in track
      ? (track as JamendoTrackResult).imageUrl
      : (track as AudiusTrackResult).artworkUrl
    : null;

  const title = track
    ? 'name' in track
      ? (track as JamendoTrackResult).name
      : (track as AudiusTrackResult).title
    : '';

  const artistName = track?.artistName ?? '';
  // P39.5: streaming "more from this artist" rows (after artistName is known)
  const more = useMoreFromArtist(artistName, trackId, 5);
  const albumName =
    track && 'albumName' in track
      ? (track as JamendoTrackResult).albumName
      : undefined;
  const duration = track?.duration ?? 0;
  const description =
    track && 'description' in track
      ? (track as AudiusTrackResult).description
      : undefined;

  // The app's ONE duration format (`utils/timeAgo.ts`) — the screen
  // used to own a second formatter that disagreed with it on the empty
  // case ("0:00" against the shared ""). A duration of zero means
  // "unknown", so the badge is not drawn at all rather than drawn
  // empty: the Movie detail's rule.
  const durationLabel = duration > 0 ? formatDuration(duration) : undefined;

  /**
   * Play the track.
   *
   * The typed facade (V21), awaited, so a refused launch says WHY
   * instead of disappearing. The old screen called the pre-V21
   * `openPlayer` without awaiting it: the rejection became an
   * unhandled promise rejection and the `false` reply was discarded
   * (M-13).
   */
  const handlePlay = useCallback(async () => {
    if (!track) return;
    const fileUri = 'audioUrl' in track ? track.audioUrl : track.streamUrl;
    const fileTitle = 'name' in track ? track.name : track.title;
    const result = await play({
      uri: fileUri,
      title: fileTitle,
      mediaType: 'music',
      // The artwork this screen ALREADY computed — it reached the More
      // sheet's `currentItem` and the header, and the launch was the one
      // place it did not. Without it the session carried no artwork, the
      // checkpoint wrote the history entry with `thumbnailPath: ''`, and
      // the search tile for that track had nothing to draw (B-026).
      ...(imageUrl ? {thumbnailPath: imageUrl} : {}),
    });
    if (result.ok) return;
    if (isNetworkError(result.error)) {
      toast.show(
        'No connection. The track will open when you are online.',
        'warning',
        {duration: 6000},
      );
    } else if (isUnsupportedError(result.error)) {
      toast.show(
        'This audio format is not supported by the player.',
        'error',
        {duration: 6000},
      );
    } else if (isExpiredError(result.error)) {
      toast.show('Sign in expired. Please sign in again.', 'warning', {
        duration: 6000,
      });
    } else if (isBlockedError(result.error)) {
      toast.show(
        'This content is not available in your region.',
        'error',
        {duration: 6000},
      );
    } else if (isLaunchError(result.error)) {
      const detail = result.error.code ? ` [${result.error.code}]` : '';
      toast.show(
        `Player couldn’t start${detail ? ` — ${detail}` : ''}. ${result.error.message}`,
        'error',
        {duration: 8000},
      );
    } else {
      toast.show(
        'Could not open the player. Please try again.',
        'error',
        {duration: 6000},
      );
    }
  }, [track, play, toast, imageUrl]);

  // P39.5: streaming rows play directly
  const handleMorePlay = useCallback(
    async (t: JamendoTrackResult) => {
      const result = await play({
        uri: t.audioUrl,
        title: t.name,
        mediaType: 'music',
        // Same reason as `handlePlay`: the row's own cover art.
        ...(t.imageUrl ? {thumbnailPath: t.imageUrl} : {}),
      });
      if (result.ok) return;
      toast.show('Could not open the player. Please try again.', 'error', {
        duration: 6000,
      });
    },
    [play, toast],
  );

  const handleShare = useCallback(() => {
    if (!track) return;
    const shareTitle = 'name' in track ? track.name : track.title;
    const artist = track.artistName ?? '';
    // 52.3/56.2: real share sheet with deep link + https fallback
    shareContent({
      route: 'MusicDetail',
      params: {trackId, source},
      title: shareTitle,
      subtitle: artist || undefined,
    });
  }, [track, trackId, source]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          flex: 1,
        },
        listContent: {
          paddingBottom: spacing.xxxl,
        },
        // ── The artwork ─────────────────────────────────────────────
        coverWrap: {
          alignSelf: 'center',
          width: '100%',
          maxWidth: 300,
          aspectRatio: 1,
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.background.elevated,
        },
        cover: {
          width: '100%',
          height: '100%',
        },
        coverPlaceholder: {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.elevated,
        },
        // ── The title and the artist ───────────────────────────────
        titleBlock: {
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
        },
        // ── The badges ─────────────────────────────────────────────
        metaRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          marginTop: spacing.md,
        },
        badge: {
          backgroundColor: colors.accent.goldDim,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
        },
        // ── The actions ────────────────────────────────────────────
        actions: {
          paddingHorizontal: spacing.lg,
          marginTop: spacing.xl,
          gap: spacing.md,
        },
        playButton: {
          backgroundColor: colors.accent.gold,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        outlineButton: {
          borderWidth: 1.5,
          borderColor: colors.accent.gold,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        // ── The description ────────────────────────────────────────
        description: {
          paddingHorizontal: spacing.lg,
          marginTop: spacing.lg,
          lineHeight: 22,
        },
        // ── The section below ──────────────────────────────────────
        sectionTitle: {
          paddingHorizontal: spacing.lg,
          marginTop: spacing.xxl,
          marginBottom: spacing.sm,
        },
      }),
    [colors],
  );

  // ── The hero — the list's header ────────────────────────────────────
  const hero = track ? (
    <>
      {/* ── The artwork ── */}
      <View style={styles.coverWrap}>
        {imageUrl ? (
          <MediaImage
            source={imageUrl}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <SvgIcon name="music" size={80} color={colors.accent.gold} />
          </View>
        )}
      </View>

      {/* ── The title and the artist ── */}
      <View style={styles.titleBlock}>
        <AppText
          variant="displaySerif"
          color="primary"
          numberOfLines={2}>
          {title}
        </AppText>
        {artistName ? (
          <AppText variant="body2" color="secondary" numberOfLines={1}>
            {artistName}
          </AppText>
        ) : null}
      </View>

      {/* ── The badges ── */}
      <View style={styles.metaRow}>
        {durationLabel ? (
          <View style={styles.badge}>
            <AppText variant="caption" color="accent">
              {durationLabel}
            </AppText>
          </View>
        ) : null}
        {albumName ? (
          <View style={styles.badge}>
            <AppText variant="caption" color="accent">
              {albumName}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* ── The actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.playButton}
          activeOpacity={0.8}
          onPress={handlePlay}
          accessibilityLabel="Play track"
          accessibilityRole="button">
          <SvgIcon name="play" size={22} color={colors.text.inverse} />
          <AppText variant="button" color="inverse">
            Play
          </AppText>
        </TouchableOpacity>

        {/* P34.1: add streaming track to a playlist */}
        <TouchableOpacity
          style={styles.outlineButton}
          activeOpacity={0.8}
          onPress={() => setSheetVisible(true)}
          accessibilityLabel="Add track to playlist"
          accessibilityRole="button">
          <SvgIcon name="listMusic" size={20} color={colors.accent.gold} />
          <AppText variant="button" color="accent">
            Add to Playlist
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ── The description ── */}
      {description ? (
        <AppText
          variant="body2"
          color="tertiary"
          style={styles.description}
          numberOfLines={6}>
          {description}
        </AppText>
      ) : null}

      {/* ── The section below ── */}
      {more.tracks.length > 0 ? (
        <AppText variant="displaySans" color="primary" style={styles.sectionTitle}>
          More From {artistName}
        </AppText>
      ) : null}
    </>
  ) : null;

  return (
    <ScreenContainer
      header={
        <InternalHeader
          title={title || 'Track'}
          rightAction={
            track
              ? {
                  icon: 'share',
                  accessibilityLabel: 'Share track',
                  onPress: handleShare,
                }
              : undefined
          }
        />
      }>
      <SimbaStatusBar variant="home" />

      {/* ── The page is ONE list ─────────────────────────────────────
          The hero is its header, the "more from this artist" tracks
          are its rows, and the loading / error / empty states are its
          empty component. There is no `ScrollView` above it: the old
          screen had a `FlatList` inside a `ScrollView`, which is the
          nesting React Native warns about (M-12). */}
      <FlatList
        style={styles.list}
        data={more.tracks}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <StreamingRow track={item} onPlay={handleMorePlay} showDownload />
        )}
        ListHeaderComponent={hero}
        ListEmptyComponent={
          // The states ride INSIDE the list, so there is no layout
          // flicker when the track resolves (the Podcast detail's
          // pattern). With the track loaded and no other tracks, there
          // is nothing to say — an empty list is not an error.
          track ? null : isLoading ? (
            <Placeholder
              variant="loading"
              anchor="center"
              title="Loading track…"
            />
          ) : (
            <Placeholder
              variant="empty"
              anchor="center"
              icon="alertCircle"
              iconColor={colors.semantic.error}
              title={error ?? 'Track not found'}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <PlaylistSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        currentItem={{
          fileUri: track
            ? 'audioUrl' in track
              ? track.audioUrl
              : track.streamUrl
            : '',
          title,
          duration,
          artist: artistName,
          album: albumName,
          thumbnailPath: imageUrl ?? undefined,
          source: 'api',
          provider: source,
          type: 'music',
          mediaType: 'audio',
        }}
      />
    </ScreenContainer>
  );
};
