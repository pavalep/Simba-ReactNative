import React, {useRef, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated, Share, Platform} from 'react-native';
import {SvgIcon} from '../../utility/SvgIcon';
import {AppText} from '../../core/AppText/AppText';
import {radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

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
}

/**
 * Premium action row with:
 *  - Heart/like button with spring bounce animation + haptic
 *  - Share button using React Native's Share API
 *  - Three-dot menu button for bookmark and overflow actions
 *  - Legacy action buttons (Info, Queue, Manage, Playlists) in a second row
 */
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
}) => {
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    // Spring bounce animation sequence: scale up then snap back
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1.0,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onLike();

    // Haptic feedback
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const RNHaptics = require('react-native-haptic-feedback');
        RNHaptics.default.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      } catch {}
    }
  }, [onLike, heartScale]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({message: 'Check out this track on SIMBA Player'});
    } catch {}
  }, []);

  const btnStyle = {
    backgroundColor: colors.background.elevated,
    borderColor: colors.border.subtle,
  };

  return (
    <>
      {/* ── Primary action row: Heart, Share, Three-dot ── */}
      <View style={styles.primaryActionRow}>
        <TouchableOpacity
          style={[styles.iconBtn, btnStyle]}
          onPress={handleLike}
          activeOpacity={0.7}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          accessibilityRole="button">
          <Animated.View style={{transform: [{scale: heartScale}]}}>
            <AppText
              style={[
                styles.heartIcon,
                {color: liked ? '#FF2D55' : colors.text.primary},
              ]}>
              {liked ? '♥' : '♡'}
            </AppText>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, btnStyle]}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityLabel="Share"
          accessibilityRole="button">
          <SvgIcon name="maximize" size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, btnStyle]}
          onPress={onOpenSubMenu}
          activeOpacity={0.7}
          accessibilityLabel="More options"
          accessibilityRole="button">
          <AppText style={[styles.dotsIcon, {color: colors.text.primary}]}>
            {'⋮'}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ── Legacy action row: Info, Queue, Manage, Playlists ── */}
      <View style={styles.secondaryActionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, btnStyle]}
          onPress={onInfo}
          activeOpacity={0.7}
          accessibilityLabel="Track info"
          accessibilityRole="button">
          <SvgIcon name="listMusic" size={20} color={colors.text.primary} />
          <AppText variant="caption" color="primary">Info</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, btnStyle]}
          onPress={onQueue}
          activeOpacity={0.7}
          accessibilityLabel="Playlist preview"
          accessibilityRole="button">
          <SvgIcon name="list" size={20} color={colors.text.primary} />
          <AppText variant="caption" color="primary">Queue</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, btnStyle]}
          onPress={onManage}
          activeOpacity={0.7}
          accessibilityLabel="Manage queue"
          accessibilityRole="button">
          <SvgIcon name="sliders" size={20} color={colors.text.primary} />
          <AppText variant="caption" color="primary">Manage</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, btnStyle]}
          onPress={onPlaylists}
          activeOpacity={0.7}
          accessibilityLabel="Add to playlist"
          accessibilityRole="button">
          <SvgIcon name="listMusic" size={20} color={colors.accent.gold} />
          <AppText variant="caption" color="primary" style={{color: colors.accent.gold}}>
            Playlists
          </AppText>
        </TouchableOpacity>
      </View>

    </>
  );
};

const styles = StyleSheet.create({
  primaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  heartIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  dotsIcon: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 0.5,
  },
});
