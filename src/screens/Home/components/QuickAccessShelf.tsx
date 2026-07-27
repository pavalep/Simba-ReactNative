import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface QuickAccessShelfProps {
  playlists: Array<{
    id: string;
    name: string;
    items: any[];
    [key: string]: any;
  }>;
  onPlaylistPress: (playlistId: string) => void;
}

export const QuickAccessShelf: React.FC<QuickAccessShelfProps> = ({
  playlists,
  onPlaylistPress,
}) => {
  const {colors} = useTheme();

  if (playlists.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <AppText variant="h2" color="accent">
          Quick Access
        </AppText>
      </View>

      {/* ── Horizontal scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {playlists.map(playlist => (
          <AppCard
            key={playlist.id}
            elevated
            onPress={() => onPlaylistPress(playlist.id)}
            style={styles.card}>
            {/* ── Item count badge (top-right) ── */}
            <View
              style={[
                styles.badge,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText variant="caption" color="accent">
                {playlist.items.length} items
              </AppText>
            </View>

            {/* ── Icon ── */}
            <SvgIcon name="listMusic" size={20} color={colors.accent.gold} />

            {/* ── Playlist name ── */}
            <AppText variant="h3" numberOfLines={1} style={styles.playlistName}>
              {playlist.name}
            </AppText>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 160,
    height: 100,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  playlistName: {
    marginTop: spacing.xs,
  },
});
