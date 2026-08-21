import React, {useRef, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated, Platform} from 'react-native';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {AppText} from '../../../../components/core/AppText/AppText';
import {radius, spacing} from '../../../../theme/tokens';
import type {ColorTokens} from '../../../../theme/tokens';
import type {MediaSource} from '../../../../types/media';
import {shareContent} from '../../../../services/shareService';

interface AudioActionRowProps {
  colors: ColorTokens;
  onBookmark: () => void;
  bookmarkCount: number;
  onInfo: () => void;
  onQueue: () => void;
  onManage: () => void;
  onPlaylists: () => void;
  onOpenSubMenu: () => void;
  liked: boolean;
  onLike: () => void;
  shareTitle?: string;
  shareArtist?: string;
  shareUri?: string;
  source?: MediaSource;
}

const IconAction: React.FC<{
  label: string;
  onPress: () => void;
  colors: ColorTokens;
  children: React.ReactNode;
  selected?: boolean;
}> = ({label, onPress, colors, children, selected = false}) => (
  <TouchableOpacity
    style={[
      styles.iconBtn,
      {
        backgroundColor: colors.background.elevated,
        borderColor: selected ? colors.accent.gold : colors.border.subtle,
      },
    ]}
    onPress={onPress}
    activeOpacity={0.75}
    accessibilityLabel={label}
    accessibilityRole="button"
    accessibilityState={{selected}}>
    {children}
  </TouchableOpacity>
);

export const AudioActionRow: React.FC<AudioActionRowProps> = ({
  colors,
  onBookmark,
  bookmarkCount,
  onInfo,
  onQueue,
  onManage,
  onPlaylists,
  onOpenSubMenu,
  liked,
  onLike,
  shareTitle,
  shareArtist,
  shareUri,
  source,
}) => {
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(heartScale, {toValue: 1.22, friction: 5, tension: 120, useNativeDriver: true}),
      Animated.spring(heartScale, {toValue: 1, friction: 5, tension: 120, useNativeDriver: true}),
    ]).start();
    onLike();
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const RNHaptics = require('react-native-haptic-feedback');
        RNHaptics.default.trigger('impactLight', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
      } catch {}
    }
  }, [onLike, heartScale]);

  const handleShare = useCallback(async () => {
    await shareContent({
      route: 'SongScreen',
      params: shareUri
        ? {fileUri: shareUri, fileTitle: shareTitle ?? '', source: source ?? 'api'}
        : undefined,
      title: shareTitle ?? 'Audio',
      subtitle: shareArtist,
    });
  }, [shareUri, shareTitle, shareArtist, source]);

  const tileStyle = {
    backgroundColor: colors.background.elevated,
    borderColor: colors.border.subtle,
  };

  return (
    <View style={styles.container}>
      <View style={styles.primaryRow}>
        <IconAction label={`Bookmark${bookmarkCount ? `, ${bookmarkCount} saved` : ''}`} onPress={onBookmark} colors={colors}>
          <SvgIcon name="bookmark" size={19} color={colors.accent.gold} />
          {bookmarkCount > 0 && (
            <AppText variant="caption" style={[styles.count, {color: colors.accent.gold}]}>{bookmarkCount}</AppText>
          )}
        </IconAction>
        <IconAction label={liked ? 'Unlike' : 'Like'} onPress={handleLike} colors={colors} selected={liked}>
          <Animated.View style={{transform: [{scale: heartScale}]}}>
            <AppText style={[styles.heartIcon, {color: liked ? colors.accent.love : colors.text.primary}]}>
              {liked ? '♥' : '♡'}
            </AppText>
          </Animated.View>
        </IconAction>
        <IconAction label="Share" onPress={handleShare} colors={colors}>
          <SvgIcon name="share" size={19} color={colors.text.primary} />
        </IconAction>
        <IconAction label="More options" onPress={onOpenSubMenu} colors={colors}>
          <AppText style={[styles.dotsIcon, {color: colors.text.primary}]}>⋮</AppText>
        </IconAction>
      </View>

      <View style={styles.secondaryRow}>
        <TouchableOpacity style={[styles.tile, tileStyle]} onPress={onInfo} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Track information">
          <SvgIcon name="info" size={18} color={colors.text.secondary} />
          <AppText variant="caption" style={[styles.tileLabel, {color: colors.text.secondary}]}>Info</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, tileStyle]} onPress={onQueue} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="View queue">
          <SvgIcon name="list" size={18} color={colors.text.secondary} />
          <AppText variant="caption" style={[styles.tileLabel, {color: colors.text.secondary}]}>Queue</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, tileStyle]} onPress={onManage} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Manage queue">
          <SvgIcon name="sliders" size={18} color={colors.text.secondary} />
          <AppText variant="caption" style={[styles.tileLabel, {color: colors.text.secondary}]}>Manage</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, tileStyle]} onPress={onPlaylists} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Add to playlist">
          <SvgIcon name="listMusic" size={18} color={colors.accent.gold} />
          <AppText variant="caption" style={[styles.tileLabel, {color: colors.accent.gold}]}>Playlist</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  count: {
    position: 'absolute',
    right: 6,
    bottom: 4,
    fontSize: 9,
  },
  heartIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  dotsIcon: {
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tile: {
    minWidth: 68,
    height: 52,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
