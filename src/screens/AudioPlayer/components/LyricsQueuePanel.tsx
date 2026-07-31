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

// ─── Constants ────────────────────────────────────────────────

/** Estimated line height for smooth scroll offset calculation */
const ESTIMATED_LINE_HEIGHT = 34;

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

// ─── Memoized lyric line (32.8) ─────────────────────────────
// Only the active line re-renders on position ticks; inactive rows
// are skipped by React.memo shallow comparison.

const LyricLineRow = React.memo<{
  item: LrcLine;
  isActive: boolean;
  isPlaying: boolean;
  onSeekToLyric?: (time: number) => void;
}>(({item, isActive, isPlaying, onSeekToLyric}) => {
  const {colors} = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  // Active-line glow loop runs only while this row is active
  useEffect(() => {
    if (isActive && isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    glow.setValue(0);
  }, [isActive, isPlaying, glow]);

  if (isActive) {
    const bgColor = glow.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(201,168,76,0.05)', 'rgba(201,168,76,0.15)'],
    });

    return (
      <TouchableOpacity
        onPress={() => onSeekToLyric?.(item.time)}
        activeOpacity={0.7}>
        <Animated.View
          style={[
            {
              paddingVertical: 6,
              paddingHorizontal: 4,
              borderRadius: 6,
            },
            {backgroundColor: bgColor},
          ]}>
          <AppText
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.accent.gold,
            }}>
            {item.text}
          </AppText>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onSeekToLyric?.(item.time)}
      activeOpacity={0.7}
      style={{paddingVertical: 6, paddingHorizontal: 4}}>
      <AppText
        style={{fontSize: 15, lineHeight: 22, color: colors.text.secondary}}>
        {item.text}
      </AppText>
    </TouchableOpacity>
  );
});
LyricLineRow.displayName = 'LyricLineRow';

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
      // Use scrollToOffset with estimated line height for smooth scrolling
      const targetOffset = Math.max(0, (activeIndex - 2) * ESTIMATED_LINE_HEIGHT);
      flatListRef.current.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
    }
  }, [activeIndex]);

  // ── Animate active line glow (moved into LyricLineRow, 32.8) ──

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

  // ── Render lyric item (memoized rows — 32.8) ──
  const renderLyricItem = useCallback(
    ({item, index}: {item: LrcLine; index: number}) => (
      <LyricLineRow
        item={item}
        isActive={index === activeIndex}
        isPlaying={isPlaying}
        onSeekToLyric={onSeekToLyric}
      />
    ),
    [activeIndex, isPlaying, onSeekToLyric],
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
      <FlatList
        ref={flatListRef}
        data={lyrics}
        renderItem={renderLyricItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 16}}
        getItemLayout={(_data, index) => ({
          length: ESTIMATED_LINE_HEIGHT,
          offset: ESTIMATED_LINE_HEIGHT * index,
          index,
        })}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
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
