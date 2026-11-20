// ─── Genre — Browse Content ────────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header. This component owns the page's HERO, the
// page's SOURCE toggle, and the list.
//
// ONE LIST, NOT A LIST INSIDE A SCROLL VIEW.
//
// The old screen put a `ScrollView` around a horizontal `FlatList` and
// a vertical `FlatList` with `scrollEnabled={false}` — a virtualised
// list inside a plain scroll view, which is what React Native warns
// about. The hero and the toggle are now the list's `ListHeaderComponent`
// and the list itself scrolls, so the page scrolls exactly as it did
// and nothing is nested.

import React, {useCallback, useMemo} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {StreamingRow} from '../../../components/media/StreamingRow/StreamingRow';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {useTheme} from '../../../theme';
import {formatDuration} from '../../../utils/timeAgo';
import {useGenreData} from './GenreDataProvider';
import type {GenreSource} from '../hooks/useGenreScreen';
import {createGenreScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';
import type {JamendoTrackResult} from '../../../types/api';
import type {ScannedTrack} from '../../../state';
import text from '../related/textContent.json';

/** The source toggle (replaces the 4-tab chip row). */
const SOURCE_TOGGLE: Array<{id: GenreSource; label: string}> = [
  {id: 'local', label: text.sources.local},
  {id: 'streaming', label: text.sources.streaming},
];

export const GenreContent: React.FC<{ctx: SectionRenderContext}> = () => {
  const {colors} = useTheme();
  const styles = useMemo(() => createGenreScreenStyles(), []);
  const {
    genre,
    source,
    setSource,
    localTracks,
    streamingTracks,
    streamingLoading,
    streamingFailed,
    retryStreaming,
    playLocalTrack,
    playStreamingTrack,
  } = useGenreData();

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(localTracks.length, 20),
    {staggerDelay: 40, direction: 'up', duration: 300},
  );

  // The hero's caption — what the page is showing, and how much of it
  // there is.
  const heroCaption =
    source === 'local'
      ? text.hero.localCaption
          .replace('{count}', String(localTracks.length))
          .replace(
            '{countLabel}',
            localTracks.length === 1 ? text.hero.track : text.hero.tracks,
          )
      : streamingLoading
        ? text.hero.loadingCaption
        : streamingFailed
          ? text.hero.failedCaption
          : text.hero.streamingCaption.replace(
              '{count}',
              String(streamingTracks.length),
            );

  const toggle = (
    <View style={styles.toggleRow}>
      {SOURCE_TOGGLE.map(t => {
        const isActive = source === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.8}
            onPress={() => setSource(t.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? colors.accent.gold
                  : colors.background.elevated,
                borderColor: isActive ? colors.accent.gold : colors.border.subtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{selected: isActive}}>
            <AppText
              variant="button"
              style={[
                styles.chipText,
                {
                  color: isActive ? colors.text.inverse : colors.text.secondary,
                },
              ]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderLocalItem = useCallback(
    ({item, index}: {item: ScannedTrack; index: number}) => (
      <TouchableOpacity
        style={[
          styles.trackItem,
          {backgroundColor: colors.background.elevated},
          animStyles[index] || {},
        ]}
        activeOpacity={0.7}
        onPress={() => playLocalTrack(item)}>
        <View style={[styles.trackNumber, {backgroundColor: colors.accent.goldDim}]}>
          <AppText variant="caption" color="secondary">
            {index + 1}
          </AppText>
        </View>
        <View style={styles.trackInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {item.artist}
          </AppText>
        </View>
        <AppText variant="caption" color="tertiary">
          {formatDuration(item.duration)}
        </AppText>
      </TouchableOpacity>
    ),
    [animStyles, colors, playLocalTrack, styles],
  );

  const renderStreamingItem = useCallback(
    ({item}: {item: JamendoTrackResult}) => (
      <StreamingRow track={item} onPlay={playStreamingTrack} />
    ),
    [playStreamingTrack],
  );

  const hero = (
    <View style={styles.hero}>
      <View style={[styles.genreIcon, {backgroundColor: colors.accent.goldDim}]}>
        <SvgIcon name="music" size={36} color={colors.accent.gold} />
      </View>
      <AppText variant="displaySerif" color="primary" style={styles.genreName}>
        {genre}
      </AppText>
      <AppText variant="caption" color="tertiary">
        {heroCaption}
      </AppText>
    </View>
  );

  const listHeader = (
    <>
      {hero}
      {toggle}
    </>
  );

  if (source === 'local') {
    return (
      <View style={styles.sectionRoot}>
        <FlatList
          testID="section-GenreScreen-list"
          style={styles.list}
          data={localTracks}
          renderItem={renderLocalItem}
          keyExtractor={track => track.uri}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="music"
              title={text.states.localEmptyTitle}
              description={text.states.localEmptyMessage.replace('{genre}', genre)}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-GenreScreen-list"
        style={styles.list}
        data={streamingTracks}
        renderItem={renderStreamingItem}
        keyExtractor={t => String(t.id)}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          streamingLoading ? (
            <Placeholder
              variant="loading"
              anchor="top-third"
              title={text.states.loadingTitle}
            />
          ) : streamingFailed ? (
            <ErrorState
              title={text.states.errorTitle}
              message={text.states.errorMessage.replace('{genre}', genre)}
              onRetry={retryStreaming}
              retryLabel={text.states.retryLabel}
            />
          ) : (
            <EmptyState
              icon="music"
              title={text.states.streamingEmptyTitle}
              description={text.states.streamingEmptyMessage.replace('{genre}', genre)}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={5}
        maxToRenderPerBatch={10}
      />
    </View>
  );
};