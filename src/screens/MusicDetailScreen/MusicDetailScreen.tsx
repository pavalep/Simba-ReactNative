import React, {useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
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
import type {JamendoTrackResult, AudiusTrackResult} from '../../types/api';

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

  const handlePlay = useCallback(() => {
    if (!track) return;
    const fileUri =
      'audioUrl' in track ? track.audioUrl : track.streamUrl;
    const fileTitle = 'name' in track ? track.name : track.title;
    navigation.navigate('AudioPlayer', {
      fileUri,
      fileTitle,
    });
  }, [track, navigation]);

  const handleShare = useCallback(() => {
    if (!track) return;
    const fileUri = 'audioUrl' in track ? track.audioUrl : track.streamUrl;
    const shareTitle = 'name' in track ? track.name : track.title;
    const artist = track.artistName ?? '';
    // 52.3: real share sheet instead of a placeholder Alert
    Share.share({
      message: `${shareTitle}${artist ? ` — ${artist}` : ''}${fileUri ? `\n${fileUri}` : ''}`,
      title: `${shareTitle} — Simba Player`,
    }).catch(() => {
      // user cancelled share
    });
  }, [track]);

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
          color: '#FFFFFF',
          fontSize: 22,
          fontWeight: '700',
        },
        overlayArtist: {
          color: 'rgba(255,255,255,0.7)',
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
            colors={['transparent', 'rgba(0,0,0,0.75)']}
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
        </View>
      </ScrollView>
    </View>
  );
};
