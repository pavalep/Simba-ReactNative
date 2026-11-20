// ────────────────────────────────────────────────────────
// Simba Player — Stats Screen (Phase 50.4-50.6)
// Honest lifetime statistics — totals, days active,
// streaks and top media, all derived from the persisted play
// ledger (`useStatsRollupStore`).
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, StyleSheet, ScrollView, FlatList, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {useStatsRollupStore, localDayKey} from '../../../state';
import {formatDuration} from '../../../utils/timeAgo';
import type {StatsScreenProps} from '../types';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';

type Props = StatsScreenProps;

export const StatsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
    const insets = useSafeAreaInsets();
  // The app's ONE bottom-chrome rule: the safe area, or the
  // mini-player dock if one is up, plus a spacing step.
  const bottomChromeInset = useBottomChromeInset();
  const {openPlayer} = useResumeAwareLaunch();

  // The roll-up is PERSISTED (it is the app's lifetime play ledger),
  // so every number below survives a cold start. It used to be a
  // transient session store, and the screen said "Plays 0" beside a
  // real streak.
  const plays = useStatsRollupStore(state => state.plays);
  const activeDays = useStatsRollupStore(state => state.activeDays);

  // ── Totals (50.4 — every number below comes from the roll-up) ──
  const playRecords = useMemo(
    () => Object.entries(plays).map(([fileUri, record]) => ({fileUri, ...record})),
    [plays],
  );

  const totalPlays = useMemo(
    () => playRecords.reduce((sum, record) => sum + record.count, 0),
    [playRecords],
  );

  /** Σ(playCount × duration). The record's own duration, in seconds. */
  const playbackSeconds = useMemo(
    () =>
      playRecords.reduce(
        (sum, record) => sum + record.count * Math.max(0, record.duration),
        0,
      ),
    [playRecords],
  );

  const trackCount = useMemo(
    () => playRecords.filter(record => record.mediaType === 'audio').length,
    [playRecords],
  );
  const videoCount = useMemo(
    () => playRecords.filter(record => record.mediaType === 'video').length,
    [playRecords],
  );

  // ── Days active + streak (50.5) ──
  // From the roll-up's DAY ledger, not from the ten-entry recency
  // list: the old source could never report more than ten active
  // days, whatever the user actually did.
  const activeDayCount = Object.keys(activeDays).length;

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    // Streak survives if the last play was yesterday.
    if (!activeDays[localDayKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (activeDays[localDayKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activeDays]);

  // ── Top media (50.4) ──
  const topMedia = useMemo(
    () =>
      [...playRecords]
        .sort((a, b) => b.count - a.count || b.lastPlayedAt - a.lastPlayedAt)
        .slice(0, 5),
    [playRecords],
  );

  const hasData = totalPlays > 0 || activeDayCount > 0;

  const statCards: Array<{label: string; value: string; icon: 'play' | 'maximize' | 'music' | 'video' | 'list' | 'speed'}> = [
    {label: 'Plays', value: String(totalPlays), icon: 'play'},
    {label: 'Playback Time', value: formatDuration(playbackSeconds), icon: 'maximize'},
    {label: 'Tracks', value: String(trackCount), icon: 'music'},
    {label: 'Videos', value: String(videoCount), icon: 'video'},
    {label: 'Days Active', value: String(activeDayCount), icon: 'list'},
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
        <BackButton />
        <AppText variant="displaySans" color="primary" style={styles.headerTitle}>
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
                        onAction={() => navigation.navigate('Library')}

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
              <AppText variant="displaySans" color="primary" style={styles.sectionTitle}>
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
                        // W9.5 — `entry.position` is SECONDS and the
                        // bridge field is MILLISECONDS, so this was a
                        // 1000x-seek bug that also bypassed the resume
                        // policy. The seam resolves the position.
                        openPlayer({
                          uri: entry.fileUri,
                          title: entry.title,
                          type: resolveStreamType(entry.type),
                          ...(entry.mediaType ? {mediaLane: entry.mediaType} : {}),
                          ...(entry.type ? {mediaKind: entry.type} : {}),
                        });
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.title}, played ${entry.count} ${entry.count === 1 ? 'time' : 'times'}`}>
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
                          {entry.count} {entry.count === 1 ? 'play' : 'plays'} ·{' '}
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

          <View style={{height: bottomChromeInset}} />
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