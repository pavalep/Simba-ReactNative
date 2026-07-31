import React, {useMemo, useCallback, useState} from 'react';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {SimbaStatusBar} from '../../components/StatusBar';
import type {MusicDetailScreenProps} from '../../navigation/types';
import {useMusicDetailScreen} from './hooks/useMusicDetailScreen';
import {useMoreFromArtist} from '../../hooks/useMoreFromArtist';
import {StreamingRow} from '../../components/media/StreamingRow/StreamingRow';
import type {JamendoTrackResult, AudiusTrackResult} from '../../types/api';
import {shareContent} from '../../services/shareService';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';

type Props = MusicDetailScreenProps;

function fmtDur(s: number): string {
  if (!s || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const MusicDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {trackId, source} = route.params;
  const {track, isLoading, error} = useMusicDetailScreen(trackId, source);
  const {colors} = useTheme();
  // P34.1: add-to-playlist sheet for streaming tracks
  const [sheetVisible, setSheetVisible] = useState(false);

  const handlePlay = useCallback(() => {
    if (!track) return;
    const fileUri =
      'audioUrl' in track ? track.audioUrl : track.streamUrl;
    const fileTitle = 'name' in track ? track.name : track.title;
    const artwork =
      'imageUrl' in track
        ? (track as JamendoTrackResult).imageUrl
        : (track as AudiusTrackResult).artworkUrl;
    navigation.navigate('AudioPlayer', {
      fileUri,
      fileTitle,
      artworkUri: artwork ?? undefined,
      source,
    });
  }, [track, navigation, source]);

  // P39.5: streaming rows play directly
  const handleMorePlay = useCallback(
    (t: JamendoTrackResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: t.audioUrl,
        fileTitle: t.name,
        artworkUri: t.imageUrl || undefined,
        source: 'jamendo',
      });
    },
    [navigation],
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
  const genreName =
    track && 'genreName' in track
      ? (track as JamendoTrackResult).genreName
      : track && 'genre' in track
        ? (track as AudiusTrackResult).genre
        : undefined;
  const duration = track?.duration ?? 0;
  const description =
    track && 'description' in track
      ? (track as AudiusTrackResult).description
      : undefined;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          paddingBottom: spacing.xxxl,
        },
        coverContainer: {
          width: '100%',
          aspectRatio: 1,
          maxHeight: 300,
          alignSelf: 'center',
          backgroundColor: colors.background.elevated,
          overflow: 'hidden',
        },
        coverImage: {
          width: '100%',
          height: '100%',
        },
        placeholderCover: {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.elevated,
        },
        gradientOverlay: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxxl,
          paddingBottom: spacing.lg,
        },
        overlayTitle: {
          color: colors.text.bright,
          fontSize: 22,
          fontWeight: '700',
        },
        overlayArtist: {
          color: colors.text.onMediaMuted,
          fontSize: 15,
          marginTop: spacing.xs,
        },
        infoSection: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
        },
        infoTitle: {
          marginBottom: spacing.xs,
        },
        infoArtist: {
          marginBottom: spacing.sm,
        },
        infoMeta: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        metaChip: {
          backgroundColor: colors.background.elevated,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
        },
        descriptionText: {
          marginTop: spacing.sm,
          lineHeight: 22,
        },
        actionsSection: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
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
        playButtonText: {
          color: colors.text.inverse,
          fontSize: 17,
          fontWeight: '700',
        },
        shareButton: {
          borderWidth: 1.5,
          borderColor: colors.accent.gold,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        shareButtonText: {
          color: colors.accent.gold,
          fontSize: 15,
          fontWeight: '600',
        },
        playlistButton: {
          borderWidth: 1.5,
          borderColor: colors.accent.gold,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
        },
        playlistButtonText: {
          color: colors.accent.gold,
          fontSize: 15,
          fontWeight: '600',
        },
        streamSection: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
        },
        streamTitle: {
          marginBottom: spacing.sm,
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        errorContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          gap: spacing.md,
        },
        errorText: {
          textAlign: 'center',
        },
      }),
    [colors],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title="Track Details" />
        <View style={styles.loadingContainer}>
          <ActivityOrb size={56} />
        </View>
      </View>
    );
  }

  if (error || !track) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title="Track Details" />
        <View style={styles.errorContainer}>
          <SvgIcon name="alertCircle" size={48} color={colors.semantic.error} />
          <AppText variant="body1" color="error" style={styles.errorText}>
            {error ?? 'Track not found'}
          </AppText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AppText variant="body1" color="accent">
              Go Back
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
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        bounces={false}>
        {/* ── Cover Art ── */}
        <View style={styles.coverContainer}>
          {imageUrl ? (
            <FastImage
              source={{uri: imageUrl}}
              style={styles.coverImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <SvgIcon
                name="music"
                size={80}
                color={colors.accent.gold}
              />
            </View>
          )}
          <LinearGradient
            colors={['transparent', colors.background.scrimMid]}
            locations={[0.3, 1]}
            style={styles.gradientOverlay}
            pointerEvents="none">
            <AppText
              variant="h3"
              style={styles.overlayTitle}
              numberOfLines={2}>
              {title}
            </AppText>
            <AppText style={styles.overlayArtist} numberOfLines={1}>
              {artistName}
            </AppText>
          </LinearGradient>
        </View>

        {/* ── Info Section ── */}
        <View style={styles.infoSection}>
          <AppText variant="h2" color="primary" style={styles.infoTitle}>
            {title}
          </AppText>
          <AppText variant="body1" color="secondary" style={styles.infoArtist}>
            {artistName}
          </AppText>

          <View style={styles.infoMeta}>
            <View style={styles.metaChip}>
              <AppText variant="caption" color="secondary">
                {fmtDur(duration)}
              </AppText>
            </View>
            {genreName ? (
              <View style={styles.metaChip}>
                <AppText variant="caption" color="secondary">
                  {genreName}
                </AppText>
              </View>
            ) : null}
            {albumName ? (
              <View style={styles.metaChip}>
                <AppText variant="caption" color="secondary">
                  {albumName}
                </AppText>
              </View>
            ) : null}
          </View>

          {description ? (
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.descriptionText}
              numberOfLines={4}>
              {description}
            </AppText>
          ) : null}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.playButton}
            activeOpacity={0.8}
            onPress={handlePlay}
            accessibilityLabel="Play track"
            accessibilityRole="button">
            <SvgIcon
              name="play"
              size={22}
              color={colors.text.inverse}
            />
            <AppText style={styles.playButtonText}>Play</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            activeOpacity={0.8}
            onPress={handleShare}
            accessibilityLabel="Share track"
            accessibilityRole="button">
            <AppText style={styles.shareButtonText}>Share</AppText>
          </TouchableOpacity>

          {/* P34.1: add streaming track to a playlist */}
          <TouchableOpacity
            style={styles.playlistButton}
            activeOpacity={0.8}
            onPress={() => setSheetVisible(true)}
            accessibilityLabel="Add track to playlist"
            accessibilityRole="button">
            <SvgIcon name="listMusic" size={20} color={colors.accent.gold} />
            <AppText style={styles.playlistButtonText}>Add to Playlist</AppText>
          </TouchableOpacity>
        </View>

        {/* P39.5: more from this artist (streaming) */}
        {more.tracks.length > 0 ? (
          <View style={styles.streamSection}>
            <AppText
              variant="h2"
              color="primary"
              style={styles.streamTitle}>
              More From {artistName}
            </AppText>
            <FlatList
              data={more.tracks}
              keyExtractor={item => String(item.id)}
              renderItem={({item}) => (
                <StreamingRow
                  track={item}
                  onPlay={handleMorePlay}
                  showDownload
                />
              )}
              scrollEnabled={false}
              initialNumToRender={more.tracks.length}
            />
          </View>
        ) : null}
      </ScrollView>

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
          source,
          mediaType: 'audio',
        }}
      />
    </View>
  );
};
