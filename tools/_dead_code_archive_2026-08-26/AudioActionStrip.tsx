import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AudioButton} from './AudioButton';
import {AudioIcon} from './AudioIcon';

interface AudioActionStripProps {
  colors: {primary: string; secondary: string; border: string; accent: string};
  isBookmarked: boolean;
  onBookmark: () => void;
  onPlaylist: () => void;
  onQueue: () => void;
  onLyrics: () => void;
  onInfo: () => void;
  onShare: () => void;
  onMore: () => void;
}

const Action: React.FC<{label: string; icon: React.ComponentProps<typeof AudioIcon>['name']; onPress: () => void; color: string; active?: boolean}> = ({label, icon, onPress, color, active}) => (
  <View style={styles.action}>
    <AudioButton icon={icon} label={label} onPress={onPress} color={color} size={42} active={active} />
    <Text style={[styles.label, {color}]} numberOfLines={1}>{label}</Text>
  </View>
);

export const AudioActionStrip: React.FC<AudioActionStripProps> = ({colors, isBookmarked, onBookmark, onPlaylist, onQueue, onLyrics, onInfo, onShare, onMore}) => (
  <View style={[styles.container, {borderTopColor: colors.border, borderBottomColor: colors.border}]}>
    <Action label="Save" icon={isBookmarked ? 'bookmarkFilled' : 'bookmark'} onPress={onBookmark} color={isBookmarked ? colors.accent : colors.secondary} active={isBookmarked} />
    <Action label="Playlist" icon="playlist" onPress={onPlaylist} color={colors.secondary} />
    <Action label="Queue" icon="queue" onPress={onQueue} color={colors.secondary} />
    <Action label="Lyrics" icon="lyrics" onPress={onLyrics} color={colors.secondary} />
    <Action label="Info" icon="info" onPress={onInfo} color={colors.secondary} />
    <Action label="Share" icon="share" onPress={onShare} color={colors.secondary} />
    <Action label="More" icon="more" onPress={onMore} color={colors.secondary} />
  </View>
);

const styles = StyleSheet.create({
  container: {flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, marginTop: 24},
  action: {alignItems: 'center', minWidth: 38},
  label: {fontSize: 10, marginTop: 3},
});
