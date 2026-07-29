import React from 'react';
import {View, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface QuickAccessShelfProps {
  title?: string;
  playlists: Array<{id: string; name: string; items?: unknown[]; trackCount?: number}>;
  onPlaylistPress: (playlistId: string) => void;
}

export const QuickAccessShelf: React.FC<QuickAccessShelfProps> = ({
  title = 'Quick Access',
  playlists,
  onPlaylistPress,
}) => {
  const {colors} = useTheme();

  if (playlists.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <AppText variant="h3" color="primary" style={styles.headerTitle}>
          {title}
        </AppText>
      </View>

      {/* ── Horizontal scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {playlists.map(playlist => (
          <TouchableOpacity
            key={playlist.id}
            activeOpacity={0.85}
            onPress={() => onPlaylistPress(playlist.id)}
            style={styles.card}>
            <LinearGradient
              colors={[colors.background.elevated, 'rgba(212,175,55,0.05)']}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.topRow}>
                <View style={[styles.iconBox, {backgroundColor: colors.accent.goldDim}]}>
                  <SvgIcon name="listMusic" size={18} color={colors.accent.gold} />
                </View>
                <View style={[styles.badge, {backgroundColor: 'rgba(212,175,55,0.1)'}]}>
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
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
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
