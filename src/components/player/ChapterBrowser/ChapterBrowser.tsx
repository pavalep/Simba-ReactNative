import React, {useEffect, useRef, useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {useAccessibility} from '../../../hooks/useAccessibility';

// ─── Types ──────────────────────────────────────────────

export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

interface ChapterBrowserProps {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// ─── Constants ──────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.sm;
const HORIZONTAL_PADDING = spacing.lg;
const COLUMNS = 3;
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (COLUMNS - 1)) / COLUMNS;
const THUMB_HEIGHT = CARD_WIDTH * (9 / 16);

// ─── Helpers ────────────────────────────────────────────

function fmtTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeRemaining(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '';
  return `-${fmtTime(seconds)}`;
}

// ─── Component ──────────────────────────────────────────

export const ChapterBrowser: React.FC<ChapterBrowserProps> = ({
  chapters,
  currentTime,
  onSeek,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const scrollRef = useRef<ScrollView>(null);

  // Find current chapter index
  const currentIndex = useMemo(() => {
    const idx = chapters.findIndex(
      ch => currentTime >= ch.startTime && currentTime < ch.endTime,
    );
    return idx >= 0 ? idx : 0;
  }, [chapters, currentTime]);

  // Auto-scroll to current chapter on mount
  useEffect(() => {
    if (chapters.length === 0 || currentIndex < 0) return;
    const row = Math.floor(currentIndex / COLUMNS);
    const scrollY = row * (THUMB_HEIGHT + CARD_GAP + 48); // card height + gap + text area
    // 59.7: reduced motion — jump directly instead of scrolling
    scrollRef.current?.scrollTo({y: Math.max(0, scrollY - 16), animated: !reduceMotion});
  }, [chapters.length, currentIndex, reduceMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingBottom: spacing.xl,
        },
        row: {
          flexDirection: 'row',
          gap: CARD_GAP,
          marginBottom: CARD_GAP,
        },
        card: {
          width: CARD_WIDTH,
          borderRadius: radius.sm,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        cardActive: {
          borderColor: colors.accent.gold,
          borderWidth: 2,
        },
        thumb: {
          width: CARD_WIDTH,
          height: THUMB_HEIGHT,
          backgroundColor: colors.background.elevated,
          alignItems: 'center',
          justifyContent: 'center',
        },
        thumbIndex: {
          fontSize: 20,
          fontWeight: '700',
        },
        cardInfo: {
          paddingHorizontal: 6,
          paddingVertical: spacing.xs,
        },
        cardTitle: {
          fontSize: 12,
          lineHeight: 14,
        },
        cardTime: {
          fontSize: 10,
          marginTop: 2,
        },
        empty: {
          paddingVertical: spacing.xxl,
          alignItems: 'center',
        },
        chapterCount: {
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.subtle,
          marginBottom: spacing.sm,
        },
      }),
    [colors],
  );

  if (chapters.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body2" color="tertiary">
          No chapters available
        </AppText>
      </View>
    );
  }

  // Render into rows of 3
  const rows: Chapter[][] = [];
  for (let i = 0; i < chapters.length; i += COLUMNS) {
    rows.push(chapters.slice(i, i + COLUMNS));
  }

  return (
    <>
      {/* Sticky-ish header with chapter count */}
      <View style={styles.chapterCount}>
        <AppText variant="caption" color="tertiary">
          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((ch, colIdx) => {
              const globalIdx = rowIdx * COLUMNS + colIdx;
              const isActive = globalIdx === currentIndex;
              return (
                <TouchableOpacity
                  key={globalIdx}
                  activeOpacity={0.7}
                  onPress={() => onSeek(ch.startTime)}
                  style={[styles.card, isActive && styles.cardActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Seek to chapter ${ch.title}`}
                  accessibilityState={{selected: isActive}}>
                  {/* Thumbnail area */}
                  <View style={styles.thumb}>
                    <AppText
                      variant="h2"
                      color={isActive ? 'accent' : 'tertiary'}
                      style={styles.thumbIndex}>
                      {globalIdx + 1}
                    </AppText>
                  </View>

                  {/* Title + time remaining */}
                  <View style={styles.cardInfo}>
                    <AppText
                      variant="caption"
                      color={isActive ? 'accent' : 'primary'}
                      numberOfLines={2}
                      style={styles.cardTitle}>
                      {ch.title}
                    </AppText>
                    {ch.endTime > 0 && (
                      <AppText
                        variant="caption"
                        color="tertiary"
                        style={styles.cardTime}>
                        {timeRemaining(ch.endTime - currentTime)}
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </>
  );
};

export default ChapterBrowser;
