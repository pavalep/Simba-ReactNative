// ─── Internet Archive Browse Screen ─────────────────────────────────────
// V18.11.1: converted from the v3-v9 TabView pattern to the v10+
// "single content stream + FAB" pattern.
//
//   • Search bar at the top (debounced via the screen)
//   • A media-type toggle (Audio / Video) sits below the search
//     bar — this is the "FAB" replacement for the old TabView
//   • One FlatList renders whichever media type is active
//   • Pull-to-refresh + error toast are handled inline
//
// V18.2 lesson: 1 useApiQuery per service method. The hook runs
// two parallel queries (audio + video) and exposes the active
// one. The screen reads `items` as a union type; the
// `mediaType` state controls which list is shown.

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';

import type {ArchiveScreenProps} from '../../../navigation/types';
import {useArchiveScreen} from '../hooks/useArchiveScreen';

import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {SvgIcon, type SvgIconName} from '../../../components/utility/SvgIcon';
import {FilterChips} from '../../../components/utility/FilterChips';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import {ARCHIVE_QUICK_SEARCHES} from '../../../constants/audiobookCategories';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../../types/api';
import {ARCHIVE_MEDIA_SCOPES} from '../related/scopeConfig';
import {styles} from '../styles';
import type {ArchiveRow, ArchiveCardProps} from '../types';

type Props = ArchiveScreenProps;

const QUICK_SEARCH_CHIP_ITEMS = ARCHIVE_QUICK_SEARCHES.map(entry => ({
  key: entry.query,
  label: entry.label,
  icon: entry.icon as SvgIconName,
}));

function audioToRow(item: InternetArchiveItemResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year, item.runtime].filter(Boolean).join(' · '),
  };
}

function videoToRow(item: InternetArchiveVideoResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year].filter(Boolean).join(' · '),
  };
}

const ArchiveCard: React.FC<ArchiveCardProps> = React.memo(
  ({row, mediaType, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row, mediaType)}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${row.title}`}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon
              name={mediaType === 'video' ? 'video' : 'headphones'}
              size={22}
              color={colors.accent.gold}
            />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.title}
          </AppText>
          {row.creator ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.creator}
            </AppText>
          ) : null}
          {row.subtitle ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>
        <SvgIcon
          name="chevronRight"
          size={18}
          color={colors.text.tertiary ?? colors.text.secondary}
        />
      </TouchableOpacity>
    );
  },
);

export const ArchiveScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialTab, query} = route.params ?? {};

  const {
    mediaType,
    setMediaType,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    items,
    hasLoaded,
    isLoading,
    error,
    isOnline,
    refreshing,
    refetch,
    handleRefresh,
  } = useArchiveScreen({initialTab, initialQuery: query});

  const toast = useToast();

  // Show error toast for page-1 failures
  React.useEffect(() => {
    if (!hasLoaded && !isLoading && !!error) {
      toast.show(
        isOnline ? 'Could not load archive.' : 'You are offline.',
        'error',
        {
          duration: 8000,
          action: {
            label: 'Retry',
            onPress: () => refetch(),
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, isLoading, error, isOnline]);

  const handleRowPress = useCallback(
    (row: ArchiveRow, mt: 'audio' | 'video') => {
      if (mt === 'video') {
        navigation.navigate('MovieDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      } else {
        navigation.navigate('ArchiveItemDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      }
    },
    [navigation],
  );

  const rows = useMemo<ArchiveRow[]>(() => {
    if (mediaType === 'audio') {
      return (items as InternetArchiveItemResult[]).map(audioToRow);
    }
    return (items as InternetArchiveVideoResult[]).map(videoToRow);
  }, [items, mediaType]);

  if (!hasLoaded && isLoading) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title="Internet Archive" />
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onDebouncedChange={setSearchTerm}
            placeholder={
              mediaType === 'audio'
                ? 'Search audio: radio, concerts, speeches…'
                : 'Search films & documentaries…'
            }
          />
          <FilterChips
            items={ARCHIVE_MEDIA_SCOPES}
            selectedKey={mediaType}
            onSelect={key => setMediaType(key as 'audio' | 'video')}
          />
        </View>
        <Placeholder
          variant="loading"
          anchor="top-third"
          title={`Loading ${mediaType === 'audio' ? 'Audio' : 'Video'}…`}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Internet Archive" />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder={
            mediaType === 'audio'
              ? 'Search audio: radio, concerts, speeches…'
              : 'Search films & documentaries…'
          }
        />
        {!searchQuery.trim() && (
          <FilterChips
            items={QUICK_SEARCH_CHIP_ITEMS}
            selectedKey={null}
            onSelect={q => {
              setSearchQuery(q);
              setSearchTerm(q);
            }}
          />
        )}
        <FilterChips
          items={ARCHIVE_MEDIA_SCOPES}
          selectedKey={mediaType}
          onSelect={key => setMediaType(key as 'audio' | 'video')}
        />
      </View>

      {hasLoaded && !error && rows.length === 0 ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="search"
          title={
            isSearchActive
              ? 'No results for this search.'
              : 'Nothing found here yet.'
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.identifier}
          renderItem={({item}) => (
            <ArchiveCard row={item} mediaType={mediaType} onPress={handleRowPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }
        />
      )}
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;
