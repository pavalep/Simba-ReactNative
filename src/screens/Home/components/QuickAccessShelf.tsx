import React, {useCallback, useState} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {PlaylistCover} from '../../../components/playlist/PlaylistCover';
import type {Playlist} from '../../../types/playlist';

interface QuickAccessShelfProps {
  title?: string;
  /**
   * The playlists the rail draws. They are WHOLE playlists: the tile
   * draws the playlist's cover, so the rail needs the artwork and the
   * pinned state — not a summary of them.
   */
  playlists: Playlist[];
  onPlaylistPress: (playlistId: string) => void;
  /** P41.5: See All coverage — every shelf links to its full catalog. */
  onSeeAll?: () => void;
}

export const QuickAccessShelf: React.FC<QuickAccessShelfProps> = ({
  title = 'Quick Access',
  playlists,
  onPlaylistPress,
  onSeeAll,
}) => {
  const {colors} = useTheme();
  // Match the other Home rails: a populated section starts expanded, and
  // the chevron owns in-memory state.
  const [userCollapsed, setUserCollapsed] = useState(false);
  const onToggleCollapsed = useCallback(() => {
    setUserCollapsed(prev => !prev);
  }, []);
  const showBody = !userCollapsed;

  // Spec §4.11: a rail with NOTHING to show collapses - the title goes
  // with it. An empty rail under a title is a lie of a different kind,
  // and the "no playlists yet" empty state belongs to the page that
  // OWNS playlists (`AllPlaylistsScreen`), not to a shelf on Home.
  if (playlists.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        label={title}
        leadingIcon="listMusic"
        actionLabel={playlists.length > 1 ? 'See All' : undefined}
        onAction={onSeeAll}
        collapsible
        collapsed={userCollapsed}
        onToggleCollapsed={onToggleCollapsed}
      />

      {showBody ? (
        <FlatList
        horizontal
        data={playlists}
        keyExtractor={playlist => playlist.id}
        renderItem={({item: playlist}) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPlaylistPress(playlist.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open playlist ${playlist.name}${playlist.pinned ? ', pinned' : ''}`}
            style={styles.card}>
            <LinearGradient
              colors={[colors.background.elevated, colors.accent.goldFaint]}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.topRow}>
                {/* The tile's icon box IS the playlist's cover - the same
                    artwork the Library card draws (spec §4.2), and with
                    it the pin badge that says which are pinned. */}
                <PlaylistCover playlist={playlist} style={styles.cover} />
                <View style={[styles.badge, {backgroundColor: colors.accent.goldSoft}]}>
                  <AppText variant="caption" color="accent" style={{fontSize: 10, fontWeight: '700'}}>
                    {playlist.items.length} ITEMS
                  </AppText>
                </View>
              </View>

              <AppText variant="h3" numberOfLines={1} style={styles.playlistName}>
                {playlist.name}
              </AppText>
              
              <View style={styles.footer}>
                <AppText variant="caption" color="tertiary">Jump back in</AppText>
                <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={Math.min(playlists.length, 24)}
        windowSize={5}
          maxToRenderPerBatch={12}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: 4,
  },
  card: {
    width: 160,
    height: 110,
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: 0,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  // The tile's artwork box. The collage fills it, and the corner radius
  // clips the cells.
  cover: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  playlistName: {
    marginTop: spacing.xs,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
