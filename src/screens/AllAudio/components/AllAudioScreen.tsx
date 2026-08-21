// ────────────────────────────────────────────────────────
// Simba Player — AllAudioScreen (Phase 20)
// ────────────────────────────────────────────────────────

import React, {useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {useNavigation} from '@react-navigation/native';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {useAllAudioScreen} from '../hooks/useAllAudioScreen';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GAP) / COLUMN_COUNT;

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AllAudioScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation();
  const {
    audioTracks,
    searchQuery,
    setSearchQuery,
    sortMode,
    toggleSort,
    viewMode,
    toggleViewMode,
    filteredTracks,
    handlePlayTrack,
    refreshing,
    handleRefresh,
  } = useAllAudioScreen();

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(filteredTracks.length, 12),
    {staggerDelay: 50, direction: 'fade', duration: 300},
  );

  // 59.2: stable renderItem — prevents cell re-renders on incidental
  // screen re-renders (search typing, view toggle) while playback runs.
  const renderGridItem = useCallback(
    ({item, index}: {item: typeof audioTracks[number]; index: number}) => (
      <TouchableOpacity
        style={[
          styles.card,
          {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
          animStyles[index] || {},
        ]}
        activeOpacity={0.7}
        onPress={() => handlePlayTrack(item.uri, item.title)}>
        <View style={[styles.thumb, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="music" size={28} color={colors.accent.gold} />
        </View>
        <AppText variant="caption" color="primary" numberOfLines={2} style={styles.cardTitle}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="tertiary" numberOfLines={1} style={styles.cardArtist}>
          {item.artist}
        </AppText>
      </TouchableOpacity>
    ),
    [colors, animStyles, handlePlayTrack],
  );

  // 59.2: stable renderItem — prevents cell re-renders on incidental
  // screen re-renders (search typing, view toggle) while playback runs.
  const renderListItem = useCallback(
    ({item, index}: {item: typeof audioTracks[number]; index: number}) => (
      <TouchableOpacity
        style={[
          styles.listItem,
          {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
          animStyles[index] || {},
        ]}
        activeOpacity={0.7}
        onPress={() => handlePlayTrack(item.uri, item.title)}>
        <View style={[styles.listThumb, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="music" size={20} color={colors.accent.gold} />
        </View>
        <View style={styles.listInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {item.artist} · {formatDuration(item.duration)}
          </AppText>
        </View>
        <SvgIcon
          name="chevronRight"
          size={16}
          color={colors.text.tertiary}
        />
      </TouchableOpacity>
    ),
    [colors, animStyles, handlePlayTrack],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="displaySans" color="primary" style={{flex: 1}}>
          All Audio
        </AppText>
        <TouchableOpacity
          style={[styles.headerBtn, {backgroundColor: colors.background.elevated}]}
          onPress={toggleViewMode}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
          activeOpacity={0.7}>
          <SvgIcon
            name={viewMode === 'grid' ? 'layoutList' : 'layoutGrid'}
            size={18}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, {backgroundColor: colors.background.elevated}]}
          onPress={toggleSort}
          accessibilityRole="button"
          accessibilityLabel="Change sort order"
          hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
          activeOpacity={0.7}>
          <SvgIcon name="list" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      {audioTracks.length > 0 && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search audio..."
          />
        </View>
      )}

      {/* ── Sort Label ── */}
      {audioTracks.length > 0 && (
        <View style={styles.sortLabel}>
          <AppText variant="caption" color="tertiary">
            Sorted by {sortMode === 'title' ? 'title' : 'artist'}
            {searchQuery.trim()
              ? ` · ${filteredTracks.length} of ${audioTracks.length}`
              : ''}
          </AppText>
        </View>
      )}

      {/* ── Content ── */}
      {audioTracks.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="music"
            title="No Audio Files"
            description="No audio files found. Scan your media library to find audio tracks."
          />
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="search"
            title="No Results"
            description="No audio files match your search."
          />
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          data={filteredTracks}
          renderItem={renderGridItem}
          keyExtractor={item => item.uri}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={{gap: GAP}}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredTracks}
          renderItem={renderListItem}
          keyExtractor={item => item.uri}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sortLabel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 4,
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    paddingHorizontal: 10,
    paddingTop: spacing.sm,
    fontWeight: '600',
  },
  cardArtist: {
    paddingHorizontal: 10,
    paddingBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  listThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
