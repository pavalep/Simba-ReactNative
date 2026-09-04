import React, {useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {useAppSelector} from '../../../store';
import {selectArtistDiscography} from '../../../store/slices/mediaSlice';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import AudioWaveform from '../../../components/player/AudioWaveform/AudioWaveform';
import {SimbaStatusBar} from '../../../components/StatusBar';
import FastImage from 'react-native-fast-image';
import {radius} from '../../../theme/tokens';
import {useCachedArt} from '../../../hooks/useCachedArt';
import {useMoreFromArtist} from '../../../hooks/useMoreFromArtist';
import {StreamingRow} from '../../../components/media/StreamingRow/StreamingRow';
import {useArtistEnrichment} from '../hooks/useArtistEnrichment';
import type {JamendoTrackResult} from '../../../types/api';
import type {RootStackScreenProps} from '../types';
type ArtistDetailScreenProps = RootStackScreenProps<'ArtistDetail'>;
import {shareContent} from '../../../services/shareService';
import { resolveStreamType, usePlayer, usePlayerActivity } from '@simba-dev/react-native-media-player';

type Props = ArtistDetailScreenProps;

// ── P39: MusicBrainz discography row (CAA cover via art cache) ──

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
  },
  chevron: {
    transform: [{rotate: '90deg'}],
  },
});

const DiscographyRow: React.FC<{
  title: string;
  subtitle: string;
  coverUrl: string | null;
  onPress: () => void;
}> = React.memo(({title, subtitle, coverUrl, onPress}) => {
  const {colors} = useTheme();
  const cached = useCachedArt(coverUrl);
  return (
    <TouchableOpacity
      style={[
        rowStyles.card,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button">
      {cached ? (
        <FastImage
          source={{uri: cached}}
          style={rowStyles.art}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[rowStyles.art, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="listMusic" size={20} color={colors.accent.gold} />
        </View>
      )}
      <View style={rowStyles.info}>
        <AppText variant="body2" color="primary" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <SvgIcon
        name="chevronUp"
        size={16}
        color={colors.text.tertiary}
        style={rowStyles.chevron}
      />
    </TouchableOpacity>
  );
});

export const ArtistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {artistName} = route.params;
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const currentFile = useAppSelector(state => state.player.currentFile);
  // V14 Phase 62: source of truth for isPlaying moves to the module.
  const {state: playerState} = usePlayer();
  const tracks = useAppSelector(state =>
    selectArtistDiscography(state, artistName),
  );

  // P39.1/39.2: MusicBrainz artist + discography (CAA covers), silent fail
  const enrichment = useArtistEnrichment(artistName);
  // P39.4/39.5: streaming "more from this artist" rows
  const more = useMoreFromArtist(artistName);

  // Derive discography (unique albums sorted by year desc)
  const discography = useMemo(() => {
    const map = new Map<
      string,
      {title: string; year: number; trackCount: number}
    >();
    for (const t of tracks) {
      const key = t.album;
      const existing = map.get(key);
      if (!existing || t.year > existing.year) {
        map.set(key, {
          title: t.album,
          year: t.year,
          trackCount: (existing?.trackCount ?? 0) + 1,
        });
      } else {
        existing.trackCount += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [tracks]);

  const allTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        if (a.album !== b.album) return a.album.localeCompare(b.album);
        return a.trackNumber - b.trackNumber;
      }),
    [tracks],
  );

  const {openPlayer} = usePlayerActivity();

  const handlePlayTrack = (uri: string, title: string) => {
    openPlayer({
      uri,
      title,
      type: resolveStreamType(resolveStreamType(resolveStreamType('music'))),
    });
  };

  // P39.4: streaming rows play directly from the artist page
  const handleStreamingPlay = useCallback(
    (track: JamendoTrackResult) => {
      openPlayer({
        uri: track.audioUrl,
        title: track.name,
        type: resolveStreamType(resolveStreamType(resolveStreamType('music'))),
      });
    },
    [openPlayer],
  );

  // P39.1: short MusicBrainz profile line for the info card
  const artistInfo = useMemo(() => {
    if (!enrichment.artist) return '';
    return (
      [
        enrichment.artist.country,
        enrichment.artist.type,
        enrichment.artist.disambiguation,
      ]
        .filter(Boolean)
        .join(' · ') || 'Verified on MusicBrainz'
    );
  }, [enrichment.artist]);

  // 56.4: share the artist via deep link + https fallback
  const handleShare = useCallback(() => {
    shareContent({
      route: 'ArtistDetail',
      params: {artistName},
      title: artistName,
    });
  }, [artistName]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? 16 : 4,
          paddingBottom: 12,
          gap: 12,
        },
        shareBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 104,
        },
        artistHeader: {
          alignItems: 'center',
          paddingVertical: 24,
          gap: 8,
        },
        avatarLarge: {
          width: 80,
          height: 80,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        },
        artistNameText: {
          fontWeight: '700',
        },
        statsRow: {
          flexDirection: 'row',
          gap: 16,
        },
        stat: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        bioCard: {
          padding: 16,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 20,
        },
        sectionTitle: {
          fontWeight: '600',
          marginBottom: 12,
        },
        sectionTitleSpaced: {
          marginTop: 20,
        },
        infoBadgeRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 6,
        },
        infoBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
        },
        albumCard: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 8,
        },
        albumArtSmall: {
          width: 44,
          height: 44,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        },
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },
        trackItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        trackNum: {
          width: 28,
          textAlign: 'center',
        },
        trackInfo: {
          flex: 1,
          marginLeft: 8,
        },
        playIcon: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [insets],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.22 : 0.12,
          },
        ]}
        pointerEvents="none"
      />

      {/* ── Header with back ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="displaySans" color="primary">
          Artist
        </AppText>
        <TouchableOpacity
          style={[styles.shareBtn, {backgroundColor: colors.background.elevated}]}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityLabel="Share artist"
          accessibilityRole="button">
          <SvgIcon name="share" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── Artist header ── */}
        <View style={styles.artistHeader}>
          <View
            style={[
              styles.avatarLarge,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <SvgIcon name="headphones" size={36} color={colors.accent.gold} />
          </View>
          <AppText
            variant="displaySerif"
            color="primary"
            style={styles.artistNameText}>
            {artistName}
          </AppText>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppText variant="body2" color="accent">
                {discography.length}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {discography.length === 1 ? 'album' : 'albums'}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="body2" color="accent">
                {tracks.length}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {tracks.length === 1 ? 'track' : 'tracks'}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Bio / MusicBrainz profile ── */}
        <View
          style={[
            styles.bioCard,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
            },
          ]}>
          <AppText variant="body2" color="secondary">
            {enrichment.artist
              ? artistInfo
              : 'Artist information is not yet available. Metadata will be enriched as more files are scanned.'}
          </AppText>
          {enrichment.artist ? (
            <View style={styles.infoBadgeRow}>
              <View
                style={[styles.infoBadge, {backgroundColor: colors.accent.goldDim}]}>
                <AppText variant="caption" style={{color: colors.accent.gold}}>
                  MusicBrainz
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Discography (MusicBrainz) ── */}
        {enrichment.releases.length > 0 ? (
          <>
            <AppText variant="displaySans" color="primary" style={styles.sectionTitle}>
              Discography
            </AppText>
            {/* 59.1: virtualized instead of .map */}
            <FlatList
              data={enrichment.releases.slice(0, 30)}
              keyExtractor={release => release.id}
              renderItem={({item: release}) => (
                <DiscographyRow
                  title={release.title}
                  subtitle={[
                    release.date.slice(0, 4),
                    release.country,
                    release.status,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  coverUrl={release.coverArtUrl}
                  onPress={() =>
                    navigation.navigate('AlbumDetail', {
                      albumTitle: release.title,
                      artistName,
                      musicBrainzReleaseId: release.id,
                    })
                  }
                />
              )}
              scrollEnabled={false}
              initialNumToRender={30}
            />
          </>
        ) : null}

        {/* ── From Your Library ── */}
        <AppText variant="displaySans" color="primary" style={styles.sectionTitle}>
          From Your Library
        </AppText>
        {/* 59.1: virtualized instead of .map */}
        <FlatList
          data={discography}
          keyExtractor={album => album.title}
          renderItem={({item: album}) => (
            <TouchableOpacity
              style={[
                styles.albumCard,
                {
                  backgroundColor: colors.background.elevated,
                  borderColor: colors.border.subtle,
                },
              ]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('AlbumDetail', {
                  albumTitle: album.title,
                  artistName,
                })
              }>
              <View
                style={[
                  styles.albumArtSmall,
                  {backgroundColor: colors.accent.goldDim},
                ]}>
                <SvgIcon
                  name="listMusic"
                  size={20}
                  color={colors.accent.gold}
                />
              </View>
              <View style={{flex: 1}}>
                <AppText variant="body2" color="primary" numberOfLines={1}>
                  {album.title}
                </AppText>
                <AppText variant="caption" color="tertiary">
                  {album.year > 0 ? `${album.year} · ` : ''}
                  {album.trackCount}{" "}
                  {album.trackCount === 1 ? 'track' : 'tracks'}
                </AppText>
              </View>
              <SvgIcon
                name="chevronUp"
                size={16}
                color={colors.text.tertiary}
                style={{transform: [{rotate: '90deg'}]}}
              />
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          initialNumToRender={discography.length}
        />

        {/* ── More from this artist (streaming) ── */}
        {more.tracks.length > 0 ? (
          <>
            <AppText
              variant="displaySans"
              color="primary"
              style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              More From {artistName}
            </AppText>
            {/* 59.1: virtualized instead of .map */}
            <FlatList
              data={more.tracks}
              keyExtractor={track => String(track.id)}
              renderItem={({item: track}) => (
                <StreamingRow
                  track={track}
                  onPlay={handleStreamingPlay}
                />
              )}
              scrollEnabled={false}
              initialNumToRender={more.tracks.length}
            />
          </>
        ) : null}

        {/* ── All tracks ── */}
        <AppText
          variant="displaySans"
          color="primary"
          style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          All Tracks
        </AppText>
        {/* 59.1: virtualized instead of .map */}
        <FlatList
          data={allTracks}
          keyExtractor={track => track.uri}
          renderItem={({item: track, index: idx}) => {
          const isCurrentTrack = currentFile?.uri === track.uri;
          const isTrackPlaying = isCurrentTrack && playerState.isPlaying;
          return (
          <TouchableOpacity
            style={[
              styles.trackItem,
              {borderBottomColor: colors.border.subtle},
              isCurrentTrack && {backgroundColor: colors.accent.goldSoft},
              idx === allTracks.length - 1 && {borderBottomWidth: 0},
            ]}
            activeOpacity={0.7}
            onPress={() => handlePlayTrack(track.uri, track.title)}>
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.trackNum}>
              {track.trackNumber > 0 ? track.trackNumber : idx + 1}
            </AppText>
            <View style={styles.trackInfo}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {track.title}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {track.album}
              </AppText>
            </View>
            <View
              style={[
                styles.playIcon,
                {backgroundColor: isCurrentTrack ? colors.accent.goldWash : colors.accent.goldDim},
              ]}>
              {isTrackPlaying ? (
                <AudioWaveform isPlaying={true} color={colors.accent.gold} size={18} barWidth={2} barGap={2} />
              ) : (
                <SvgIcon name={isCurrentTrack ? 'volume' : 'play'} size={14} color={isCurrentTrack ? colors.accent.gold : colors.accent.gold} />
              )}
            </View>
          </TouchableOpacity>
          );
          }}
          scrollEnabled={false}
          initialNumToRender={allTracks.length}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
