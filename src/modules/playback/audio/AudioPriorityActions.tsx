import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AudioIcon} from './AudioIcon';

interface AudioPriorityActionsProps {
  isBookmarked: boolean;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  border: string;
  onBookmark: () => void;
  onQueue: () => void;
}

/** Keeps only the two high-frequency secondary actions on the main player surface. */
export const AudioPriorityActions: React.FC<AudioPriorityActionsProps> = ({
  isBookmarked,
  primary,
  secondary,
  accent,
  surface,
  border,
  onBookmark,
  onQueue,
}) => (
  <View style={styles.row}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Save track'}
      accessibilityState={{selected: isBookmarked}}
      onPress={onBookmark}
      style={({pressed}) => [styles.action, {backgroundColor: surface, borderColor: isBookmarked ? accent : border}, pressed && styles.pressed]}>
      <AudioIcon name={isBookmarked ? 'bookmarkFilled' : 'bookmark'} size={18} color={isBookmarked ? accent : secondary} />
      <Text style={[styles.label, {color: isBookmarked ? accent : primary}]}>{isBookmarked ? 'Saved' : 'Save'}</Text>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open queue"
      onPress={onQueue}
      style={({pressed}) => [styles.action, {backgroundColor: surface, borderColor: border}, pressed && styles.pressed]}>
      <AudioIcon name="queue" size={18} color={secondary} />
      <Text style={[styles.label, {color: primary}]}>Queue</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 10, marginTop: 18},
  action: {flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 12},
  label: {fontSize: 13, fontWeight: '700'},
  pressed: {opacity: 0.7, transform: [{scale: 0.98}]},
});
