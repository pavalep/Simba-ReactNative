// ────────────────────────────────────────────────────────
// Simba Player — SongScreen (Phase 18)
// Individual track/song detail page
// ────────────────────────────────────────────────────────

import React, {useRef} from 'react';
import {View, TouchableOpacity, Animated, StyleSheet, Platform} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {SongHero} from './components/SongHero';
import {SongActions} from './components/SongActions';
import {SongMetadata} from './components/SongMetadata';
import {SongBookmarks} from './components/SongBookmarks';
import {useSongScreen} from './useSongScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'SongScreen'>;

export const SongScreen: React.FC<Props> = ({navigation: _navigation, route: _route}) => {
  const {colors, isDark} = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const h = useSongScreen();

  // Stagger entrance: 4 groups (Hero, Actions, Metadata, Bookmarks)
  const {styles: entranceStyles} = useAnimatedEntrance(4, {
    staggerDelay: 100,
    direction: 'up',
    duration: 350,
  });

  return (
    <SafeAreaView style={sty.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* Background */}
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Back button (fixed) */}
      <View style={sty.header}>
        <TouchableOpacity
          style={[sty.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={h.goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary">
          Track
        </AppText>
      </View>

      {/* Scrollable content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sty.scrollContent}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}>
        {/* Hero */}
        <SongHero
          title={h.displayTitle}
          artist={h.displayArtist}
          album={h.displayAlbum}
          albumArtUri={h.albumArtUri}
          onArtistPress={h.goToArtist}
          onAlbumPress={h.displayAlbum ? h.goToAlbum : undefined}
        />

        {/* Entrance group 0: Actions */}
        <Animated.View style={entranceStyles[0]}>
          <SongActions
            onPlay={h.handlePlay}
            onAddToPlaylist={h.handleAddToPlaylist}
            onShare={h.handleShare}
            onAddToQueue={h.handleAddToQueue}
            playlistSheetVisible={h.playlistSheetVisible}
            onClosePlaylistSheet={h.handleClosePlaylistSheet}
            playlistSheetItem={h.playlistSheetItem}
          />
        </Animated.View>

        {/* Entrance group 1: Metadata */}
        <Animated.View style={entranceStyles[1]}>
          <SongMetadata
            duration={h.formatDuration(h.displayDuration)}
            format={h.displayFormat}
            genre={h.displayGenre}
            year={h.displayYear}
            filePath={h.displayPath}
            onCopyPath={h.handleCopyPath}
          />
        </Animated.View>

        {/* Entrance group 2: Bookmarks */}
        <Animated.View style={entranceStyles[2]}>
          <SongBookmarks
            fileUri={h.fileUri}
            fileTitle={h.displayTitle}
            duration={h.displayDuration}
            bookmarks={h.bookmarksForFile}
            count={h.bookmarkCountForFile}
            sheetVisible={h.bookmarkSheetVisible}
            onOpenSheet={h.handleOpenBookmarkSheet}
            onCloseSheet={h.handleCloseBookmarkSheet}
            onSave={h.handleSaveBookmark}
            onDelete={h.handleDeleteBookmark}
            onJumpTo={h.handleJumpToBookmark}
            formatDuration={h.formatDuration}
          />
        </Animated.View>

        {/* Entrance group 3: Lyrics (if available) */}
        {h.hasLyrics ? (
          <Animated.View style={entranceStyles[3]}>
            <View style={[sty.lyricsCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
              <AppText variant="h3" color="secondary" style={sty.lyricsSectionTitle}>
                Lyrics
              </AppText>
              <AppText variant="body2" color="tertiary" numberOfLines={3} style={sty.lyricsPreview}>
                {h.lyricsPreview}
              </AppText>
              <TouchableOpacity
                onPress={h.handleViewFullLyrics}
                activeOpacity={0.7}
                style={sty.lyricsLink}
                accessibilityRole="button">
                <AppText variant="body2" color="accent">
                  View Full Lyrics →
                </AppText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}

        {/* Bottom padding */}
        <View style={sty.bottomPadding} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const sty = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 12,
    gap: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  lyricsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  lyricsSectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  lyricsPreview: {
    lineHeight: 20,
  },
  lyricsLink: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 60,
  },
});
