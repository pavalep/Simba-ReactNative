import React, {useCallback, useState} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {EmptyState} from '../../../components/utility/EmptyState/EmptyState';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';

interface QuickAccessShelfProps {
  title?: string;
  playlists: Array<{id: string; name: string; items?: unknown[]; trackCount?: number}>;
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
  // Match the other Home rails: empty sections start collapsed, while
  // populated sections start expanded. The chevron owns in-memory state.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const hasData = playlists.length > 0;
  const collapsed = userCollapsed ?? !hasData;
  const onToggleCollapsed = useCallback(() => {
    setUserCollapsed(prev => (prev ?? !hasData) ? false : true);
  }, [hasData]);
  const showBody = !collapsed;

  return (
    <View style={styles.container}>
      <SectionHeader
        label={title}
        leadingIcon="listMusic"
        actionLabel={playlists.length > 1 ? 'See All' : undefined}
        onAction={onSeeAll}
        collapsible
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />

      {showBody && playlists.length === 0 ? (
        <EmptyState
          icon="listMusic"
          title="No Playlists Yet"
          description="Create a playlist from the player to see it here."
          variant="compact"
        />
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
            style={styles.card}>
            <LinearGradient
              colors={[colors.background.elevated, colors.accent.goldFaint]}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.topRow}>
                <View style={[styles.iconBox, {backgroundColor: colors.accent.goldDim}]}>
                  <SvgIcon name="listMusic" size={18} color={colors.accent.gold} />
                </View>
                <View style={[styles.badge, {backgroundColor: colors.accent.goldSoft}]}>
                  <AppText variant="caption" color="accent" style={{fontSize: 10, fontWeight: '700'}}>
                    {(playlist.items?.length ?? playlist.trackCount ?? 0)} ITEMS
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
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
