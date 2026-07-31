// ─── Internet Archive Browse Screen ────────────────────────────────────
// Phase 37.4/37.5: search audio + video items on archive.org. Audio →
// ArchiveItemDetail (track list), video → MovieDetail (existing player).

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {ArchiveScreenProps} from '../../navigation/types';
import {useArchiveScreen} from './hooks/useArchiveScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {SkeletonList} from '../../components/core/Skeleton/SkeletonList';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import FastImage from 'react-native-fast-image';
import {ARCHIVE_QUICK_SEARCHES} from '../../constants/audiobookCategories';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../types/api';

type Props = ArchiveScreenProps;

const ARCHIVE_TABS = ['audio', 'video'] as const;

// ─── Normalized rows ───────────────────────────────────────────────────

interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  subtitle: string;
}

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

// ─── Row Card ──────────────────────────────────────────────────────────

interface ArchiveCardProps {
  row: ArchiveRow;
  mediaType: 'audio' | 'video';
  onPress: (row: ArchiveRow) => void;
}

const ArchiveCard: React.FC<ArchiveCardProps> = React.memo(
  ({row, mediaType, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
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

// ─── Component ─────────────────────────────────────────────────────────

export const ArchiveScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const {initialTab, query} = route.params ?? {};
  const {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    audioResults,
    videoResults,
    isLoading,
    error,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
  } = useArchiveScreen(initialTab, query);

  const rows = useMemo(
    () => (tab === 'audio' ? audioResults.map(audioToRow) : videoResults.map(videoToRow)),
    [tab, audioResults, videoResults],
  );

  const handleRowPress = useCallback(
    (row: ArchiveRow) => {
      if (tab === 'video') {
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
    [navigation, tab],
  );

  const isEmpty = !isLoading && !error && rows.length === 0;

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Internet Archive" />

      <View style={styles.content}>
        {/* Tab chips */}
        <View style={styles.modeRow}>
          <FlatList
            horizontal
            data={ARCHIVE_TABS}
            keyExtractor={t => t}
            renderItem={({item: t}) => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTab(t)}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: active
                        ? colors.accent.gold
                        : colors.background.elevated,
                      borderColor: active
                        ? colors.accent.gold
                        : colors.border.subtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  accessibilityLabel={`${t === 'audio' ? 'Audio' : 'Video'} results`}>
                  <AppText
                    variant="caption"
                    style={[
                      styles.modeChipText,
                      {
                        color: active
                          ? colors.background.primary
                          : colors.text.secondary,
                      },
                    ]}>
                    {t === 'audio' ? 'Audio' : 'Video'}
                  </AppText>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.modeRail}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            initialNumToRender={ARCHIVE_TABS.length}
          />
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            tab === 'audio'
              ? 'Search audio: radio, concerts, speeches…'
              : 'Search films & documentaries…'
          }
        />

        {/* Quick-search chips */}
        {!searchQuery.trim() && (
          <FlatList
            horizontal
            data={ARCHIVE_QUICK_SEARCHES}
            keyExtractor={entry => entry.id}
            renderItem={({item: entry}) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchQuery(entry.query)}
                style={[
                  styles.chip,
                  {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${entry.label}`}>
                <SvgIcon
                  name={entry.icon as never}
                  size={14}
                  color={colors.accent.gold}
                />
                <AppText variant="caption">{entry.label}</AppText>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.chipScroll}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={ARCHIVE_QUICK_SEARCHES.length}
            windowSize={5}
            maxToRenderPerBatch={12}
          />
        )}

        {isLoading && <SkeletonList count={6} />}

        {!isLoading && error && (
          <ErrorState
            message={isOnline ? error : 'You are offline.'}
            onRetry={retry}
          />
        )}

        {isEmpty && (
          <View style={styles.centerState}>
            <SvgIcon name="search" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              No results found. Try a different search.
            </AppText>
          </View>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <FlatList
            data={rows}
            keyExtractor={item => item.identifier}
            renderItem={({item}) => (
              <ArchiveCard row={item} mediaType={tab} onPress={handleRowPress} />
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
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  modeRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  modeRail: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeChipText: {
    fontWeight: '700',
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
    paddingBottom: 80,
  },
  stateText: {
    textAlign: 'center',
  },
});
