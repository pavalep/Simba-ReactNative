import React, {useRef, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {LrcLine} from '../../../utils/lrcParser';

// ─── Props ──────────────────────────────────────────────────

export interface QueueEntry {
  uri: string;
  title: string;
  duration?: number;
}

export interface LyricsQueuePanelProps {
  /** Parsed LRC lyrics lines */
  lyrics: LrcLine[];
  /** Current playback position in seconds */
  currentPosition: number;
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Called when user taps a lyric line to seek to that position */
  onSeekToLyric?: (time: number) => void;
  /** Upcoming queue entries */
  queue?: QueueEntry[];
  /** Index of the currently playing track in the queue */
  currentIndex?: number;
  /** Function to play a specific queue entry */
  onPlayFromQueue?: (index: number) => void;
}

// ─── Component ──────────────────────────────────────────────

const LyricsQueuePanel: React.FC<LyricsQueuePanelProps> = ({
  lyrics,
  currentPosition,
  isPlaying,
  onSeekToLyric,
  queue = [],
  currentIndex = -1,
  onPlayFromQueue,
}) => {
  const {colors} = useTheme();
  const flatListRef = useRef<FlatList<LrcLine>>(null);
  const activeLineAnim = useRef(new Animated.Value(0)).current;

  // ── Find active lyric line ──
  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentPosition) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, currentPosition]);

  // ── Auto-scroll to active line ──
  useEffect(() => {
    if (activeIndex >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: Math.max(0, activeIndex - 2),
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [activeIndex]);

  // ── Animate active line glow ──
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(activeLineAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(activeLineAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      activeLineAnim.setValue(0);
    }
    return () => activeLineAnim.stopAnimation();
  }, [isPlaying, activeLineAnim]);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: 20,
        },
        sectionLabel: {
          marginBottom: 8,
        },
        lyricsList: {
          flex: 1,
        },
        lyricRow: {
          paddingVertical: 6,
          paddingHorizontal: 4,
        },
        lyricText: {
          fontSize: 15,
          lineHeight: 22,
          color: colors.text.secondary,
        },
        activeLyricText: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.accent.gold,
        },
        activeLyricRow: {
          paddingVertical: 6,
          paddingHorizontal: 4,
          borderRadius: 6,
        },
        noLyrics: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
        },
        // ── Queue section ──
        queueSection: {
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          paddingTop: 12,
          marginTop: 8,
        },
        queueItemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 4,
          borderRadius: 6,
        },
        queueIndex: {
          width: 24,
          textAlign: 'center',
          marginRight: 10,
        },
        queueTitle: {
          flex: 1,
        },
        queueActiveDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.accent.gold,
          marginRight: 8,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border.subtle,
        },
      }),
    [colors],
  );

  // ── Render lyric item ──
  const renderLyricItem = useCallback(
    ({item, index}: {item: LrcLine; index: number}) => {
      const isActive = index === activeIndex;

      if (isActive) {
        const bgColor = activeLineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(201,168,76,0.05)', 'rgba(201,168,76,0.15)'],
        });

        return (
          <TouchableOpacity
            onPress={() => onSeekToLyric?.(item.time)}
            activeOpacity={0.7}>
            <Animated.View
              style={[styles.activeLyricRow, {backgroundColor: bgColor}]}>
              <AppText style={styles.activeLyricText}>{item.text}</AppText>
            </Animated.View>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          onPress={() => onSeekToLyric?.(item.time)}
          activeOpacity={0.7}
          style={styles.lyricRow}>
          <AppText style={styles.lyricText}>{item.text}</AppText>
        </TouchableOpacity>
      );
    },
    [activeIndex, activeLineAnim, styles, onSeekToLyric],
  );

  // ── Key extractor ──
  const keyExtractor = useCallback(
    (item: LrcLine, index: number) => `${item.time}-${index}`,
    [],
  );

  // ── If no lyrics, show placeholder ──
  if (lyrics.length === 0) {
    return (
      <View style={styles.container}>
        <AppText
          variant="caption"
          color="secondary"
          style={styles.sectionLabel}>
          Lyrics
        </AppText>
        <View style={styles.noLyrics}>
          <AppText variant="body2" color="secondary">
            No lyrics available
          </AppText>
        </View>

        {/* Queue section */}
        {renderQueueSection()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText
        variant="caption"
        color="secondary"
        style={styles.sectionLabel}>
        Lyrics
      </AppText>

      <FlatList
        ref={flatListRef}
        data={lyrics}
        renderItem={renderLyricItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 16}}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
      />

      {/* Queue section */}
      {renderQueueSection()}
    </View>
  );

  // ── Queue section renderer ──
  function renderQueueSection() {
    if (queue.length === 0) return null;

    return (
      <View style={styles.queueSection}>
        <AppText
          variant="caption"
          color="secondary"
          style={[styles.sectionLabel, {marginBottom: 4}]}>
          Up Next
        </AppText>
        {queue.map((entry, i) => {
          if (i <= currentIndex) return null;
          return (
            <TouchableOpacity
              key={`queue-${i}-${entry.uri}`}
              style={styles.queueItemRow}
              onPress={() => onPlayFromQueue?.(i)}
              activeOpacity={0.7}>
              <AppText
                variant="caption"
                color="secondary"
                style={styles.queueIndex}>
                {i + 1}
              </AppText>
              <AppText
                variant="body2"
                color="primary"
                numberOfLines={1}
                style={styles.queueTitle}>
                {entry.title}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
};

export default LyricsQueuePanel;
