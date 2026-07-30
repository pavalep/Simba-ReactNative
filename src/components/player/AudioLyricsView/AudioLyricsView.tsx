import React, {useRef, useEffect, useMemo, useCallback, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {LrcLine} from '../../../utils/lrcParser';

// ─── Constants ────────────────────────────────────────────────

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ESTIMATED_LINE_HEIGHT = 40;
const HEADER_HEIGHT = 56;

type TabType = 'lyrics' | 'queue';

// ─── Props ──────────────────────────────────────────────────

export interface AudioLyricsViewEntry {
  uri: string;
  title: string;
  duration?: number;
}

export interface AudioLyricsViewProps {
  /** Whether this overlay is visible */
  visible: boolean;
  /** Called to close/dismiss the full-screen view */
  onClose: () => void;
  /** Parsed LRC lyrics lines */
  lyrics: LrcLine[];
  /** Current playback position in seconds */
  currentPosition: number;
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Called when user taps a lyric line to seek to that position */
  onSeekToLyric?: (time: number) => void;
  /** Upcoming queue entries */
  queue?: AudioLyricsViewEntry[];
  /** Index of the currently playing track in the queue */
  currentIndex?: number;
  /** Function to play a specific queue entry */
  onPlayFromQueue?: (index: number) => void;
}

// ─── Component ──────────────────────────────────────────────

const AudioLyricsView: React.FC<AudioLyricsViewProps> = ({
  visible,
  onClose,
  lyrics,
  currentPosition,
  isPlaying,
  onSeekToLyric,
  queue = [],
  currentIndex = -1,
  onPlayFromQueue,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<LrcLine>>(null);
  const [activeTab, setActiveTab] = useState<TabType>('lyrics');
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // ── Entrance animation ──
  const entranceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setHasAutoScrolled(false);
      Animated.spring(entranceAnim, {
        toValue: 1,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      entranceAnim.setValue(0);
    }
  }, [visible, entranceAnim]);

  const overlayTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  const overlayOpacity = entranceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

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

  // ── Active line pulse ──
  const activeLinePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    if (isPlaying && activeIndex >= 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(activeLinePulse, {toValue: 1, duration: 1500, useNativeDriver: false}),
          Animated.timing(activeLinePulse, {toValue: 0, duration: 1500, useNativeDriver: false}),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      activeLinePulse.setValue(0);
    }
  }, [isPlaying, activeIndex, activeLinePulse, visible]);

  // ── Spring animation auto-scroll (item 15.7) ──
  useEffect(() => {
    if (activeIndex >= 0 && flatListRef.current && visible) {
      const targetOffset = Math.max(0, (activeIndex - 3) * ESTIMATED_LINE_HEIGHT);
      // First scroll: animated. Subsequent: spring via scrollToOffset
      if (!hasAutoScrolled) {
        flatListRef.current.scrollToOffset({offset: targetOffset, animated: true});
        setHasAutoScrolled(true);
      } else {
        flatListRef.current.scrollToOffset({offset: targetOffset, animated: true});
      }
    }
  }, [activeIndex, visible, hasAutoScrolled]);

  // ── No lyrics animation ──
  const noteAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (lyrics.length === 0 && visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(noteAnim, {toValue: 1, duration: 1200, easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t, useNativeDriver: true}),
          Animated.timing(noteAnim, {toValue: 0, duration: 1200, easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t, useNativeDriver: true}),
        ]),
      ).start();
    } else {
      noteAnim.setValue(0);
    }
    return () => noteAnim.stopAnimation();
  }, [lyrics.length, visible, noteAnim]);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFill,
          zIndex: 100,
        },
        container: {
          flex: 1,
          backgroundColor: 'rgba(10,10,12,0.98)',
          paddingTop: insets.top,
        },
        // ── Header ──
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: HEADER_HEIGHT,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        headerTitle: {
          fontSize: 17,
          fontWeight: '600',
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
        },
        // ── Toggle Tabs (15.9) ──
        tabRow: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 8,
        },
        tabBtn: {
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 20,
        },
        tabBtnActive: {
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
        tabBtnInactive: {
          backgroundColor: 'transparent',
        },
        tabLabel: {
          fontSize: 14,
          fontWeight: '500',
        },
        // ── Lyrics content ──
        lyricsContainer: {
          flex: 1,
        },
        lyricsList: {
          flex: 1,
          paddingHorizontal: 24,
        },
        lyricRow: {
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: 8,
        },
        activeLyricRow: {
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: 8,
        },
        lyricText: {
          fontSize: 16,
          lineHeight: 24,
          color: colors.text.secondary,
        },
        activeLyricText: {
          fontSize: 18,
          fontWeight: '700',
          color: '#FFFFFF', // bright white (15.6)
        },
        // ── No lyrics empty state (15.10) ──
        noLyricsContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 60,
        },
        noLyricsIconWrap: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        },
        noLyricsText: {
          fontSize: 15,
          color: colors.text.secondary,
          marginTop: 8,
        },
        // ── Queue section ──
        queueContainer: {
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 8,
        },
        queueItemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 10,
          marginBottom: 4,
        },
        queueItemActive: {
          backgroundColor: 'rgba(201,168,76,0.1)',
        },
        queueIndex: {
          width: 28,
          textAlign: 'center',
          marginRight: 12,
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
        queueSeparator: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
        },
      }),
    [colors, insets],
  );

  // ── Render lyric item ──
  const renderLyricItem = useCallback(
    ({item, index}: {item: LrcLine; index: number}) => {
      const isActive = index === activeIndex;

      if (isActive) {
        const bgOpacity = activeLinePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.06, 0.14],
        });

        return (
          <TouchableOpacity
            onPress={() => onSeekToLyric?.(item.time)}
            activeOpacity={0.7}>
            <Animated.View
              style={[styles.activeLyricRow, {backgroundColor: `rgba(255,255,255,${isPlaying ? 0.08 : 0.04})`}]}>
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
    [activeIndex, activeLinePulse, styles, onSeekToLyric, isPlaying],
  );

  // ── Key extractor ──
  const keyExtractor = useCallback(
    (item: LrcLine, index: number) => `${item.time}-${index}`,
    [],
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          transform: [{translateY: overlayTranslateY}],
        },
      ]}>
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <AppText variant="h3" color="primary" style={styles.headerTitle}>
            {activeTab === 'lyrics' ? 'Lyrics' : 'Up Next'}
          </AppText>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SvgIcon name="chevronDown" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Toggle Tabs (15.9) ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lyrics' ? styles.tabBtnActive : styles.tabBtnInactive]}
            onPress={() => setActiveTab('lyrics')}
            activeOpacity={0.7}>
            <AppText
              variant="body2"
              style={[styles.tabLabel, {color: activeTab === 'lyrics' ? '#FFFFFF' : colors.text.secondary}]}>
              Lyrics
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'queue' ? styles.tabBtnActive : styles.tabBtnInactive]}
            onPress={() => setActiveTab('queue')}
            activeOpacity={0.7}>
            <AppText
              variant="body2"
              style={[styles.tabLabel, {color: activeTab === 'queue' ? '#FFFFFF' : colors.text.secondary}]}>
              Queue
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        {activeTab === 'lyrics' ? (
          lyrics.length === 0 ? (
            /* ── No Lyrics Empty State (15.10) ── */
            <View style={styles.noLyricsContainer}>
              <Animated.View
                style={[
                  styles.noLyricsIconWrap,
                  {
                    transform: [
                      {
                        translateY: noteAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                    ],
                  },
                ]}>
                <SvgIcon name="music" size={28} color={colors.text.tertiary} />
              </Animated.View>
              <AppText variant="body1" color="secondary" style={styles.noLyricsText}>
                No lyrics available
              </AppText>
            </View>
          ) : (
            /* ── Lyrics List ── */
            <View style={styles.lyricsContainer}>
              <FlatList
                ref={flatListRef}
                data={lyrics}
                renderItem={renderLyricItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingVertical: 16, paddingBottom: 60}}
                getItemLayout={(_data, index) => ({
                  length: ESTIMATED_LINE_HEIGHT,
                  offset: ESTIMATED_LINE_HEIGHT * index,
                  index,
                })}
                windowSize={7}
                maxToRenderPerBatch={15}
                removeClippedSubviews={true}
              />
            </View>
          )
        ) : (
          /* ── Queue Tab ── */
          <View style={styles.queueContainer}>
            {queue.length === 0 ? (
              <View style={styles.noLyricsContainer}>
                <AppText variant="body1" color="secondary">
                  Queue is empty
                </AppText>
              </View>
            ) : (
              <FlatList
                data={queue}
                keyExtractor={(item, index) => `queue-${index}-${item.uri}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 60}}
                renderItem={({item, index}) => {
                  const isActive = index === currentIndex;
                  if (index < (currentIndex ?? -1) + 1) return null;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.queueItemRow,
                        isActive && styles.queueItemActive,
                      ]}
                      onPress={() => onPlayFromQueue?.(index)}
                      activeOpacity={0.7}>
                      <AppText
                        variant="caption"
                        color="secondary"
                        style={styles.queueIndex}>
                        {index + 1}
                      </AppText>
                      {isActive && <View style={styles.queueActiveDot} />}
                      <AppText
                        variant="body2"
                        color="primary"
                        numberOfLines={1}
                        style={styles.queueTitle}>
                        {item.title}
                      </AppText>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default AudioLyricsView;
