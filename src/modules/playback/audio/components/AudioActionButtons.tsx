import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {AppText} from '../../../../components/core/AppText/AppText';
import {radius} from '../../../../theme/tokens';
import type {ColorTokens} from '../../../../theme/tokens';

interface Props {
  onInfo: () => void;
  onQueue: () => void;
  onManage: () => void;
  onPlaylists: () => void;
  onBookmark: () => void;
  bookmarkCount?: number;
  colors: ColorTokens;
}

export const AudioActionButtons: React.FC<Props> = ({
  onInfo,
  onQueue,
  onManage,
  onPlaylists,
  onBookmark,
  bookmarkCount = 0,
  colors,
}) => {
  const btnStyle = {
    backgroundColor: colors.background.elevated,
    borderColor: colors.border.subtle,
  };

  return (
    <View style={styles.actionRow}>
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
        onPress={onBookmark}
        activeOpacity={0.7}
        accessibilityLabel={bookmarkCount > 0 ? `${bookmarkCount} bookmarks` : 'Bookmark'}
        accessibilityRole="button">
        <SvgIcon name="bookmark" size={20} color={bookmarkCount > 0 ? colors.accent.gold : colors.text.primary} />
        <AppText variant="caption" color="primary" style={{color: bookmarkCount > 0 ? colors.accent.gold : colors.text.primary}}>
          {bookmarkCount > 0 ? `Bookmarks (${bookmarkCount})` : 'Bookmark'}
        </AppText>
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
  );
};

const styles = StyleSheet.create({
  actionRow: {
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
