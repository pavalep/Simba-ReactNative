// ────────────────────────────────────────────────────────
// Simba Player — ArtistDiscography Component (Phase 16.3/16.9)
// Horizontal scroll album cards with gradient overlay
// ────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface DiscographyAlbum {
  title: string;
  year: number;
  trackCount: number;
  albumArtUri?: string;
}

interface ArtistDiscographyProps {
  albums: DiscographyAlbum[];
  onAlbumPress: (albumName: string) => void;
}

const CARD_WIDTH = 160;
const SCREEN_PADDING = 20;

export const ArtistDiscography: React.FC<ArtistDiscographyProps> = ({
  albums,
  onAlbumPress,
}) => {
  const {colors} = useTheme();

  if (albums.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="displaySans" color="primary" style={styles.sectionTitle}>
        Discography
      </AppText>

      <FlatList
        horizontal
        data={albums}
        keyExtractor={album => album.title}
        renderItem={({item: album}) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => onAlbumPress(album.title)}
            accessibilityRole="button"
            accessibilityLabel={`Open album ${album.title}`}>
            {/* Album art placeholder with gradient overlay */}
            <View
              style={[
                styles.artContainer,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <SvgIcon
                name="listMusic"
                size={36}
                color={colors.accent.gold}
              />
              {/* Gradient overlay at bottom */}
              <LinearGradient
                colors={['transparent', colors.background.scrimMid]}
                style={styles.artOverlay}
                pointerEvents="none"
              />
            </View>

            {/* Album info below art */}
            <View style={styles.info}>
              <AppText
                variant="body2"
                color="primary"
                numberOfLines={1}
                style={styles.albumName}>
                {album.title}
              </AppText>
              <View style={styles.metaRow}>
                {album.year > 0 && (
                  <AppText variant="caption" color="tertiary">
                    {album.year}
                  </AppText>
                )}
                {album.year > 0 && album.trackCount > 0 && (
                  <AppText variant="caption" color="tertiary">
                    {' · '}
                  </AppText>
                )}
                {album.trackCount > 0 && (
                  <AppText variant="caption" color="tertiary">
                    {album.trackCount}{' '}
                    {album.trackCount === 1 ? 'track' : 'tracks'}
                  </AppText>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        initialNumToRender={Math.min(albums.length, 24)}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  artContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  info: {
    paddingTop: spacing.sm,
    gap: 2,
  },
  albumName: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
