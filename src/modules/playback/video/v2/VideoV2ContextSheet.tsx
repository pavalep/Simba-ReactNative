import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Button} from './VideoV2Button';

type Panel = 'queue' | 'chapters' | 'info';
type Props = Pick<VideoV2Model, 'colors' | 'queue' | 'chapters' | 'metadata' | 'title'> & {
  visible: boolean;
  panel: Panel;
  onClose: () => void;
  onSelectQueueItem: (uri: string) => void;
  onSelectChapter: (time: number) => void;
};

const formatTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
};

export const VideoV2ContextSheet: React.FC<Props> = ({colors, queue, chapters, metadata, title, visible, panel, onClose, onSelectQueueItem, onSelectChapter}) => {
  const heading = panel === 'queue' ? 'Up next' : panel === 'chapters' ? 'Chapters' : 'Video information';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={`Close ${heading}`} />
        <View style={[styles.sheet, {backgroundColor: colors.background.scrimStrong, borderColor: colors.border.emphasis}]}>
          <View style={styles.header}><Text style={[styles.title, {color: colors.text.bright}]}>{heading}</Text><VideoV2Button icon="close" label={`Close ${heading}`} onPress={onClose} color={colors.text.bright} size={40} /></View>
          {panel === 'queue' ? queue.map((entry, index) => <Pressable key={`${entry.uri}-${index}`} accessibilityRole="button" accessibilityLabel={`Play ${entry.title}`} onPress={() => {onSelectQueueItem(entry.uri); onClose();}} style={({pressed}) => [styles.row, pressed && styles.pressed]}><Text style={[styles.index, {color: colors.text.secondary}]}>{index + 1}</Text><Text style={[styles.rowText, {color: colors.text.bright}]} numberOfLines={2}>{entry.title}</Text><Text style={[styles.chevron, {color: colors.text.secondary}]}>›</Text></Pressable>) : null}
          {panel === 'chapters' ? chapters.map((chapter, index) => <Pressable key={`${chapter.startTime}-${index}`} accessibilityRole="button" accessibilityLabel={`Play chapter ${chapter.title || index + 1}`} onPress={() => {onSelectChapter(chapter.startTime); onClose();}} style={({pressed}) => [styles.row, pressed && styles.pressed]}><Text style={[styles.time, {color: colors.accent.gold}]}>{formatTime(chapter.startTime)}</Text><Text style={[styles.rowText, {color: colors.text.bright}]} numberOfLines={2}>{chapter.title || `Chapter ${index + 1}`}</Text><Text style={[styles.chevron, {color: colors.text.secondary}]}>›</Text></Pressable>) : null}
          {panel === 'info' ? <View>{[
            ['Title', metadata?.title || title],
            ['Artist', metadata?.artist],
            ['Album', metadata?.album],
            ['Year', metadata?.year ? String(metadata.year) : ''],
            ['Genre', metadata?.genre],
            ['Language', metadata?.language],
          ].filter(([, value]) => Boolean(value)).map(([label, value]) => <View key={label} style={styles.infoRow}><Text style={[styles.infoLabel, {color: colors.text.secondary}]}>{label}</Text><Text style={[styles.infoValue, {color: colors.text.bright}]}>{value}</Text></View>)}{!metadata && <Text style={[styles.empty, {color: colors.text.secondary}]}>No additional metadata available.</Text>}</View> : null}
          {panel === 'queue' && queue.length === 0 ? <Text style={[styles.empty, {color: colors.text.secondary}]}>There are no videos queued after this one.</Text> : null}
          {panel === 'chapters' && chapters.length === 0 ? <Text style={[styles.empty, {color: colors.text.secondary}]}>This video has no chapters.</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 18, paddingBottom: 28},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  title: {fontSize: 20, fontWeight: '800'},
  row: {minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent'},
  index: {width: 22, fontSize: 12, textAlign: 'center'},
  time: {width: 52, fontSize: 12, fontVariant: ['tabular-nums']},
  rowText: {flex: 1, fontSize: 15, fontWeight: '700'},
  chevron: {fontSize: 25, fontWeight: '300'},
  infoRow: {flexDirection: 'row', gap: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent'},
  infoLabel: {width: 72, fontSize: 12, fontWeight: '700'},
  infoValue: {flex: 1, fontSize: 14},
  empty: {paddingVertical: 22, fontSize: 14, lineHeight: 20},
  pressed: {opacity: 0.68},
});
