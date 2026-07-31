// ────────────────────────────────────────────────────────
// Simba Player — Stats Screen (Phase 50.4-50.6)
// Honest session statistics — totals, days active,
// streaks and top media, all derived from real history.
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, FlatList, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {useAppSelector} from '../../store';
import {formatDuration} from '../../utils/timeAgo';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'Stats'>;

/** Local calendar day key (avoids UTC shifting from toISOString). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const StatsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const mediaLibrary = useAppSelector(state => state.session.mediaLibrary);
  const playCounts = useAppSelector(state => state.session.playCounts);

  // ── Totals (50.4 — every number below comes from the session store) ──
  const totalPlays = useMemo(
    () => Object.values(playCounts).reduce((sum, n) => sum + n, 0),
    [playCounts],
  );

  /** Σ(playCount × duration) — mediaLibrary is authoritative, recentFiles fallback. */
  const playbackSeconds = useMemo(() => {
    const durationByUri = new Map<string, number>();
    mediaLibrary.forEach(e => durationByUri.set(e.fileUri, e.duration));
    recentFiles.forEach(e => {
      if (!durationByUri.has(e.fileUri)) {
        durationByUri.set(e.fileUri, e.duration);
      }
    });
    let total = 0;
    Object.entries(playCounts).forEach(([uri, count]) => {
      total += count * Math.max(0, durationByUri.get(uri) ?? 0);
    });
    return total;
  }, [mediaLibrary, recentFiles, playCounts]);

  const trackCount = useMemo(
    () => mediaLibrary.filter(e => e.mediaType === 'audio').length,
    [mediaLibrary],
  );
  const videoCount = useMemo(
    () => mediaLibrary.filter(e => e.mediaType === 'video').length,
    [mediaLibrary],
  );

  // ── Days active + streak (50.5) ──
  const activeDays = useMemo(() => {
    const days = new Set<string>();
    recentFiles.forEach(e => {
      const d = new Date(e.lastPlayedAt);
      if (!Number.isNaN(d.getTime())) {
        days.add(dayKey(d));
      }
    });
    return days;
  }, [recentFiles]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    // Streak survives if the last play was yesterday.
    if (!activeDays.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (activeDays.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activeDays]);

  // ── Top media (50.4) ──
  const topMedia = useMemo(
    () =>
      recentFiles
        .filter(e => (playCounts[e.fileUri] ?? 0) > 0)
        .sort((a, b) => (playCounts[b.fileUri] ?? 0) - (playCounts[a.fileUri] ?? 0))
        .slice(0, 5),
    [recentFiles, playCounts],
  );

  const hasData = totalPlays > 0 || recentFiles.length > 0;

  const statCards: Array<{label: string; value: string; icon: 'play' | 'maximize' | 'music' | 'video' | 'list' | 'speed'}> = [
    {label: 'Plays', value: String(totalPlays), icon: 'play'},
    {label: 'Playback Time', value: formatDuration(playbackSeconds), icon: 'maximize'},
    {label: 'Tracks', value: String(trackCount), icon: 'music'},
    {label: 'Videos', value: String(videoCount), icon: 'video'},
    {label: 'Days Active', value: String(activeDays.size), icon: 'list'},
    {label: 'Day Streak', value: String(streak), icon: 'speed'},
  ];

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <SvgIcon name="chevronDown" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary" style={styles.headerTitle}>
          Stats
        </AppText>
      </View>

      {!hasData ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="list"
            title="No Stats Yet"
            description="Play some music or videos and your totals, streaks and top media will show up here."
            actionLabel="Browse Library"
            onAction={() =>
              navigation.navigate('MainTabs', {
                screen: 'LibraryTab',
                params: {screen: 'Library'},
              })
            }
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* Stats grid (50.5) */}
          <View style={styles.statsGrid}>
            {statCards.map(stat => (
              <View
                key={stat.label}
                style={[
                  styles.statCell,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <SvgIcon
                  name={stat.icon}
                  size={18}
                  color={colors.accent.gold}
                />
                <AppText
                  variant="h3"
                  color="primary"
                  style={styles.statValue}>
                  {stat.value}
                </AppText>
                <AppText variant="caption" color="tertiary">
                  {stat.label}
                </AppText>
              </View>
            ))}
          </View>

          {/* Top media (50.4) */}
          {topMedia.length > 0 && (
            <View style={styles.section}>
              <AppText variant="h3" color="primary" style={styles.sectionTitle}>
                Most Played
              </AppText>
              <View
                style={[
                  styles.groupCard,
                  {backgroundColor: colors.background.elevated},
                ]}>
                {/* 59.1: virtualized top-media rows */}
                <FlatList
                  data={topMedia}
                  keyExtractor={entry => entry.fileUri}
                  renderItem={({item: entry, index}) => (
                    <TouchableOpacity
                      style={[styles.topRow, {borderBottomColor: colors.border.subtle}]}
                      onPress={() => {
                        if (entry.mediaType === 'audio') {
                          navigation.navigate('AudioPlayer', {
                            fileUri: entry.fileUri,
                            fileTitle: entry.title,
                          });
                        } else {
                          navigation.navigate('VideoPlayer', {
                            fileUri: entry.fileUri,
                            fileTitle: entry.title,
                          });
                        }
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.title}, played ${playCounts[entry.fileUri]} times`}>
                      <View
                        style={[
                          styles.rankBadge,
                          {backgroundColor: colors.accent.goldDim},
                        ]}>
                        <AppText variant="bodySmall" color="accent">
                          {index + 1}
                        </AppText>
                      </View>
                      <View style={styles.topBody}>
                        <AppText
                          variant="body2"
                          color="primary"
                          numberOfLines={1}>
                          {entry.title}
                        </AppText>
                        <AppText variant="caption" color="tertiary">
                          {playCounts[entry.fileUri]} plays ·{' '}
                          {formatDuration(entry.duration)}
                        </AppText>
                      </View>
                      <SvgIcon
                        name={entry.mediaType === 'audio' ? 'music' : 'video'}
                        size={16}
                        color={colors.text.tertiary}
                      />
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  initialNumToRender={topMedia.length}
                />
              </View>
            </View>
          )}

          <View style={{height: insets.bottom + 24}} />
        </ScrollView>
      )}
    </View>
  );
};

export default StatsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  groupCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBody: {
    flex: 1,
  },
});
