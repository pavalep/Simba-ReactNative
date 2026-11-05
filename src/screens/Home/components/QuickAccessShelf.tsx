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
  /**
   * What the rail says when it has nothing to show.
   *
   * A rail with NOTHING to show used to take its TITLE with it (spec
   * §4.11). That is right for a rail that only appears once it has
   * data — but this rail is the feature's front door, so when the
   * caller passes a message the rail stays on the page and says what
   * would fill it.
   */
  emptyMessage?: string;
}

export const QuickAccessShelf: React.FC<QuickAccessShelfProps> = ({
  title = 'Quick Access',
  playlists,
  onPlaylistPress,
  onSeeAll,
  emptyMessage,
}) => {
  const {colors} = useTheme();
  // Match the other Home rails: a populated section starts expanded, and
  // the chevron owns in-memory state.
  const [userCollapsed, setUserCollapsed] = useState(false);
  const onToggleCollapsed = useCallback(() => {
    setUserCollapsed(prev => !prev);
  }, []);
  const showBody = !userCollapsed;

  // The rail stays on the page even with nothing in it, WHEN the caller
  // gives it an `emptyMessage`: this rail is the feature's front door,
  // and a Home page that never mentions it is how the feature went
  // missing unnoticed. Without an `emptyMessage` a rail with nothing
  // to show still collapses (spec §4.11) — the title would go with it.
  if (playlists.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        label={title}
        leadingIcon="listMusic"
        actionLabel="See All"
        onAction={onSeeAll}
        collapsible
        collapsed={userCollapsed}
        onToggleCollapsed={onToggleCollapsed}
      />

      {showBody && playlists.length === 0 && emptyMessage ? (
        <View style={styles.empty}>
          <AppText variant="caption" color="tertiary">
            {emptyMessage}
          </AppText>
        </View>
      ) : null}

      {showBody && playlists.length > 0 ? (
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
  empty: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
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
