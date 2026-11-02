// ────────────────────────────────────────────────────────
// Simba Player — AllPlaylistsScreen (Phase 20)
// ────────────────────────────────────────────────────────

import React, {useCallback, useMemo, useState} from 'react';
import {
  Animated,
  View,
  TouchableOpacity,
  FlatList,
  SectionList,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppButton} from '../../../components/core/AppButton/AppButton';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {PlaylistActionMenu} from '../../../components/playlist/PlaylistActionMenu';
import {PlaylistCard} from '../../../components/playlist/PlaylistCard';
import {PlaylistCreateModal} from '../../../components/playlist/PlaylistCreateModal';
// The kind chips have ONE owner: the Library's own filter list, whose
// labels come from `PLAYLIST_KIND_LABELS` - so a kind can never be
// spelled two ways, and a kind added to `PlaylistKind` cannot leave this
// rail behind (spec §4.5).
import {LOCAL_PLAYLIST_FILTERS} from '../../../features/library/presentation/related/localFilesConfig';
import {useAllPlaylistsScreen} from '../hooks/useAllPlaylistsScreen';
import type {Playlist, PlaylistKind} from '../../../types/playlist';

type PlaylistSection = {
  title: string;
  data: Playlist[];
};

export const AllPlaylistsScreen: React.FC = () => {
  const {colors} = useTheme();
  const {
    allPlaylists,
    filterType,
    setFilterType,
    filteredPlaylists,
    pinnedPlaylists,
    otherPlaylists,
    handlePlaylistPress,
    handleCreate,
    handleTogglePin,
  } = useAllPlaylistsScreen();

  // ── Create Modal State ──
  // The create FORM belongs to `PlaylistCreateModal` - the one owner. This
  // screen only owns whether that modal is open.
  const [createVisible, setCreateVisible] = useState(false);

  // ── The long-press menu ──
  // The menu is the SHORTCUT, not the only door: the card carries a
  // visible 32 px pin toggle too, because a long-press is not reachable
  // by a screen reader or a keyboard (D-P8, spec §4.5).
  const [actionPlaylistId, setActionPlaylistId] = useState<string | null>(null);

  // The menu reads the LIVE playlist, so a pin changed elsewhere shows in
  // the menu's label instead of a stale snapshot. It is looked up in the
  // UNFILTERED list on purpose: the filter can change while the sheet is
  // open, and a menu that loses its playlist because a chip was pressed
  // is a menu that closes itself for no reason.
  const actionPlaylist = useMemo(
    () => allPlaylists.find(playlist => playlist.id === actionPlaylistId) ?? null,
    [allPlaylists, actionPlaylistId],
  );

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(filteredPlaylists.length, 12),
    {staggerDelay: 50, direction: 'up', duration: 300},
  );

  /**
   * The list's two sections.
   *
   * The PINNED section is rendered ONLY when something is pinned: a
   * section with nothing in it is noise (spec §4.11). The other section
   * holds the playlists that are NOT pinned — a playlist is rendered
   * ONCE, in the section that describes its state, so the page never
   * shows the same playlist twice under two headings.
   */
  const sections = useMemo<PlaylistSection[]>(() => {
    const next: PlaylistSection[] = [];
    if (pinnedPlaylists.length > 0) {
      next.push({title: 'Pinned', data: pinnedPlaylists});
    }
    if (otherPlaylists.length > 0) {
      next.push({title: 'Other playlists', data: otherPlaylists});
    }
    return next;
  }, [pinnedPlaylists, otherPlaylists]);

  const handleCreateSubmit = useCallback(
    (name: string, kind: PlaylistKind) => {
      handleCreate(name, kind);
      setCreateVisible(false);
    },
    [handleCreate],
  );

  const handleLongPress = useCallback((playlistId: string) => {
    setActionPlaylistId(playlistId);
  }, []);

  const handleCloseActionMenu = useCallback(() => {
    setActionPlaylistId(null);
  }, []);

  const renderPlaylist = ({item, index}: {item: Playlist; index: number}) => (
    <Animated.View style={animStyles[index] || undefined}>
      <PlaylistCard
        playlist={item}
        onPress={handlePlaylistPress}
        onLongPress={handleLongPress}
        onTogglePin={handleTogglePin}
      />
    </Animated.View>
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
        <AppText variant="displaySans" color="primary" style={styles.title}>
          All Playlists
        </AppText>
        {/* The ONE create affordance on this page. There is no FAB: a
            second create button on one page is two ways to do one thing
            (spec §4.5). */}
        <AppButton
          title="Create"
          variant="primary"
          size="sm"
          onPress={() => setCreateVisible(true)}
        />
      </View>

      {/* ── Kind filter ── */}
      {/* A FILTER: it narrows what the page SHOWS. It never changes what
          a playlist may contain (spec §4.5). */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={LOCAL_PLAYLIST_FILTERS}
          keyExtractor={item => item.key}
          renderItem={({item}) => {
            const isActive = filterType === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.accent.goldDim
                      : colors.background.elevated,
                    borderColor: isActive
                      ? colors.accent.gold
                      : colors.border.subtle,
                  },
                ]}
                onPress={() => setFilterType(item.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} playlists`}
                accessibilityState={{selected: isActive}}>
                <AppText
                  variant="caption"
                  color={isActive ? 'accent' : 'secondary'}
                  style={styles.filterChipLabel}>
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filterRail}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={LOCAL_PLAYLIST_FILTERS.length}
        />
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {allPlaylists.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="listMusic"
              title="No playlists yet"
              description="Create your first playlist to organize your media."
              actionLabel="Create playlist"
              onAction={() => setCreateVisible(true)}
            />
          </View>
        ) : filteredPlaylists.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="listMusic"
              title="No playlists yet"
              description="Pick another kind to see your playlists."
            />
          </View>
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderPlaylist}
            keyExtractor={item => item.id}
            renderSectionHeader={({section}) => (
              <AppText
                variant="overline"
                color="secondary"
                accessibilityRole="header"
                style={styles.sectionHeader}>
                {section.title}
              </AppText>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            initialNumToRender={8}
            windowSize={5}
            maxToRenderPerBatch={8}
          />
        )}
      </View>

      {/* ── Create Modal ── */}
      {/* One owner for "create a playlist": PlaylistCreateModal. */}
      <PlaylistCreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={handleCreateSubmit}
      />

      {/* ── Long-press menu ── */}
      <PlaylistActionMenu
        visible={actionPlaylist !== null}
        playlist={actionPlaylist}
        onTogglePin={handleTogglePin}
        onClose={handleCloseActionMenu}
      />
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
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterRail: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipLabel: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
