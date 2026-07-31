// ─── Remote Results ─────────────────────────────────────────────────────
// P40.5/40.6: per-source result sections from the aggregator. Each source
// renders its own rows with the correct destination, its own skeleton
// while loading, and its own compact empty state — one failed API never
// blanks the page (aggregator isolates errors per source).

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon, IconName} from '../../../components/utility/SvgIcon';
import {DownloadButton} from '../../../components/core/DownloadButton/DownloadButton';
import type {AggregatedSearchResults} from '../../../types/api';
import type {
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
} from '../../../types/api';
import type {SearchSource} from './SourceFilterChips';

// ── Compact per-source row ──

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 6,
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
  trailing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface MediaRowProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  icon: IconName;
  trailing: 'play' | 'chevron';
  /** 49.5: optional offline download action (renders DownloadButton). */
  download?: {uri: string; title: string; mediaType?: 'audio' | 'video'; source?: string};
  onPress: () => void;
}

const MediaRow: React.FC<MediaRowProps> = React.memo(
  ({title, subtitle, imageUrl, icon, trailing, download, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        style={[
          rowStyles.card,
          {backgroundColor: colors.background.elevated},
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityRole="button">
        {imageUrl ? (
          <FastImage
            source={{uri: imageUrl}}
            style={rowStyles.art}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[rowStyles.art, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon name={icon} size={20} color={colors.accent.gold} />
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
        {download ? (
          <DownloadButton
            uri={download.uri}
            title={download.title}
            mediaType={download.mediaType}
            source={download.source}
            size={16}
          />
        ) : (
          <View style={[rowStyles.trailing, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon
              name={trailing === 'play' ? 'play' : 'chevronRight'}
              size={14}
              color={colors.accent.gold}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

// ── Section wrapper + skeleton ──

const sectionStyles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  title: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skeletonRow: {
    height: 56,
    borderRadius: radius.md,
    marginBottom: 6,
    marginHorizontal: spacing.md,
  },
  emptyBox: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});

const SkeletonRows: React.FC<{count?: number}> = React.memo(({count = 2}) => {
  const {colors} = useTheme();
  const skeletonData = React.useMemo(
    () => Array.from({length: count}, (_, i) => i),
    [count],
  );
  return (
    <FlatList
      data={skeletonData}
      keyExtractor={item => `skeleton-${item}`}
      renderItem={() => (
        <View
          style={[
            sectionStyles.skeletonRow,
            {backgroundColor: colors.background.elevated},
          ]}
        />
      )}
      scrollEnabled={false}
      initialNumToRender={count}
    />
  );
});

const Section: React.FC<{label: string; children: React.ReactNode}> = ({
  label,
  children,
}) => (
  <View style={sectionStyles.section}>
    <AppText variant="h3" color="primary" style={sectionStyles.title}>
      {label}
    </AppText>
    {children}
  </View>
);

// ── Main component ──

export interface RemoteResultsHandlers {
  onPlayTrack: (track: JamendoTrackResult) => void;
  onPlayAudius: (track: AudiusTrackResult) => void;
  onOpenAudiobook: (book: AudiobookResult) => void;
  onOpenArchive: (item: InternetArchiveItemResult) => void;
  onOpenChannel: (channel: IPTVChannelResult) => void;
}

interface RemoteResultsProps {
  results: AggregatedSearchResults;
  isLoading: boolean;
  source: SearchSource;
  handlers: RemoteResultsHandlers;
}

export const RemoteResults: React.FC<RemoteResultsProps> = React.memo(
  ({results, isLoading, source, handlers}) => {
    if (source === 'local') return null;
    const showAll = source === 'all';
    const showMusic = showAll || source === 'music';
    const showPodcasts = showAll || source === 'podcasts';
    const showRadio = showAll || source === 'radio';
    const showTv = showAll || source === 'tv';
    const showAudiobooks = showAll || source === 'audiobooks';
    const showArchive = showAll || source === 'archive';

    const hasMusic =
      results.jamendoTracks.length + results.audiusTracks.length > 0;
    const hasPodcasts = results.podcasts.length > 0;
    const hasRadio = results.radioStations.length > 0;
    const hasTv = results.iptvChannels.length > 0;
    const hasAudiobooks = results.audiobooks.length > 0;
    const hasArchive = results.internetArchiveItems.length > 0;

    return (
      <>
        {showMusic && (hasMusic || isLoading) ? (
          <Section label="Music">
            {isLoading ? (
              <SkeletonRows />
            ) : (
              <>
                <FlatList
                  data={results.jamendoTracks}
                keyExtractor={item => `jamendo-${item.id}`}
                renderItem={({item}) => (
                  <MediaRow
                    title={item.name}
                    subtitle={item.artistName}
                    imageUrl={item.imageUrl}
                    icon="music"
                    trailing="play"
                    download={{uri: item.audioUrl, title: item.name, mediaType: 'audio', source: 'jamendo'}}
                    onPress={() => handlers.onPlayTrack(item)}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={results.jamendoTracks.length}
              />
              <FlatList
                data={results.audiusTracks}
                keyExtractor={item => `audius-${item.id}`}
                renderItem={({item}) => (
                  <MediaRow
                    title={item.title}
                    subtitle={item.artistName}
                    imageUrl={item.artworkUrl}
                    icon="music"
                    trailing="play"
                    download={{uri: item.streamUrl, title: item.title, mediaType: 'audio', source: 'audius'}}
                    onPress={() => handlers.onPlayAudius(item)}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={results.audiusTracks.length}
              />
            </>
            )}
          </Section>
        ) : source === 'music' && !hasMusic && !isLoading ? (
          <Section label="Music">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No music results found
              </AppText>
            </View>
          </Section>
        ) : null}

        {showPodcasts && (hasPodcasts || isLoading) ? (
          <Section label="Podcasts">
            {/* Podcast Index needs SHA1 auth — aggregator leaves it empty */}
            {isLoading ? <SkeletonRows /> : null}
          </Section>
        ) : source === 'podcasts' && !hasPodcasts && !isLoading ? (
          <Section label="Podcasts">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No podcasts found
              </AppText>
            </View>
          </Section>
        ) : null}

        {showRadio && (hasRadio || isLoading) ? (
          <Section label="Radio">
            {/* Radio Browser needs name-based query — aggregator leaves it empty */}
            {isLoading ? <SkeletonRows /> : null}
          </Section>
        ) : source === 'radio' && !hasRadio && !isLoading ? (
          <Section label="Radio">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No radio stations found
              </AppText>
            </View>
          </Section>
        ) : null}

        {showTv && (hasTv || isLoading) ? (
          <Section label="TV">
            {isLoading ? (
              <SkeletonRows />
            ) : (
              <FlatList
                data={results.iptvChannels}
                keyExtractor={item => `tv-${item.id}`}
                renderItem={({item}) => (
                  <MediaRow
                    title={item.name}
                    subtitle={`${item.country} · ${item.category}`}
                    imageUrl={item.logo}
                    icon="video"
                    trailing="play"
                    onPress={() => handlers.onOpenChannel(item)}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={results.iptvChannels.length}
              />
            )}
          </Section>
        ) : source === 'tv' && !hasTv && !isLoading ? (
          <Section label="TV">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No TV channels found
              </AppText>
            </View>
          </Section>
        ) : null}

        {showAudiobooks && (hasAudiobooks || isLoading) ? (
          <Section label="Audiobooks">
            {isLoading ? (
              <SkeletonRows />
            ) : (
              <FlatList
                data={results.audiobooks}
                keyExtractor={item => `book-${item.id}`}
                renderItem={({item}) => (
                  <MediaRow
                    title={item.title}
                    subtitle={item.author}
                    imageUrl=""
                    icon="listMusic"
                    trailing="chevron"
                    onPress={() => handlers.onOpenAudiobook(item)}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={results.audiobooks.length}
              />
            )}
          </Section>
        ) : source === 'audiobooks' && !hasAudiobooks && !isLoading ? (
          <Section label="Audiobooks">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No audiobooks found
              </AppText>
            </View>
          </Section>
        ) : null}

        {showArchive && (hasArchive || isLoading) ? (
          <Section label="Archive">
            {isLoading ? (
              <SkeletonRows />
            ) : (
              <FlatList
                data={results.internetArchiveItems}
                keyExtractor={item => `archive-${item.identifier}`}
                renderItem={({item}) => (
                  <MediaRow
                    title={item.title}
                    subtitle={item.creator}
                    imageUrl={item.imageUrl}
                    icon="folderFill"
                    trailing="chevron"
                    onPress={() => handlers.onOpenArchive(item)}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={results.internetArchiveItems.length}
              />
            )}
          </Section>
        ) : source === 'archive' && !hasArchive && !isLoading ? (
          <Section label="Archive">
            <View style={sectionStyles.emptyBox}>
              <AppText variant="caption" color="tertiary">
                No archive items found
              </AppText>
            </View>
          </Section>
        ) : null}
      </>
    );
  },
);
