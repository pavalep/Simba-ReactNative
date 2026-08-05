// ══════════════════════════════════════════════════════════════════
// Simba Player - DownloadsScreen (Phase 49)
//
// Downloads & offline: storage usage bar, auto-delete policy (keep
// last N), live progress rows with pause/resume/delete (confirmed),
// empty state. State comes from the downloads slice mirrored from
// downloadService via useDownloadsSync.
// ══════════════════════════════════════════════════════════════════

import React, {useCallback, useMemo} from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {ConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {SimbaStatusBar} from '../../components/StatusBar';
import {formatBytes} from '../../services/cacheService';
import {navigate} from '../../navigation/navigationHelper';
import type {DownloadsScreenProps} from '../../navigation/types';
import type {DownloadRecord} from '../../services/downloadService';
import {useDownloadsScreen} from './useDownloadsScreen';

// ══ Constants ═══════════════════════════════════════════════════

const POLICY_OPTIONS = [
  {key: 0, label: 'Off'},
  {key: 5, label: '5'},
  {key: 10, label: '10'},
  {key: 25, label: '25'},
  {key: 50, label: '50'},
];

// ══ Helpers ═════════════════════════════════════════════════════

function statusLabel(record: DownloadRecord): string {
  switch (record.status) {
    case 'downloading': {
      if (record.size > 0 && record.received > 0) {
        const pct = Math.min(100, Math.round((record.received / record.size) * 100));
        return `Downloading · ${pct}%`;
      }
      return 'Downloading…';
    }
    case 'paused':
      return record.received > 0 ? 'Paused' : 'Paused';
    case 'done':
      return formatBytes(record.size);
    case 'error':
      return record.error ? `Failed · ${record.error}` : 'Failed';
    default:
      return '';
  }
}

function progressOf(record: DownloadRecord): number {
  if (record.size <= 0) return 0;
  return Math.min(1, record.received / record.size);
}

// ══ Memoized row ════════════════════════════════════════════════

interface DownloadRowProps {
  record: DownloadRecord;
  colors: ReturnType<typeof useTheme>['colors'];
  onPauseResume: (uri: string, status: string) => void;
  onDelete: (uri: string) => void;
}

const DownloadRow: React.FC<DownloadRowProps> = React.memo(
  ({record, colors, onPauseResume, onDelete}) => {
    const active = record.status === 'downloading';
    const paused = record.status === 'paused';
    const failed = record.status === 'error';
    const progress = progressOf(record);

    return (
      <View style={[styles.row, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.iconCircle, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon
            name={record.mediaType === 'video' ? 'video' : 'music'}
            size={18}
            color={colors.accent.gold}
          />
        </View>

        <View style={styles.rowBody}>
          <AppText variant="body2" color="primary" numberOfLines={1} style={styles.rowTitle}>
            {record.title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {statusLabel(record)}
          </AppText>
          {(active || paused) && (
            <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: failed ? colors.semantic.error : colors.accent.gold,
                    transform: [{scaleX: progress}],
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
            onPress={() => onPauseResume(record.uri, record.status)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={active ? 'Pause download' : 'Resume download'}>
            <SvgIcon name={active ? 'pause' : 'download'} size={16} color={colors.accent.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
            onPress={() => onDelete(record.uri)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Delete download">
            <SvgIcon name="close" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

// ══ Screen ══════════════════════════════════════════════════════

export const DownloadsScreen: React.FC<DownloadsScreenProps> = () => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const h = useDownloadsScreen();
  const glowOpacity = isDark ? 0.22 : 0.12;

  const usedBytes = useMemo(() => {
    if (!h.storage.loaded) return 0;
    return Math.max(0, h.storage.total - h.storage.free);
  }, [h.storage]);

  const storagePct = useMemo(() => {
    if (!h.storage.loaded || h.storage.total <= 0) return 0;
    return Math.min(1, usedBytes / h.storage.total);
  }, [h.storage, usedBytes]);

  const renderItem = useCallback(
    ({item}: {item: DownloadRecord}) => (
      <DownloadRow
        record={item}
        colors={colors}
        onPauseResume={h.handlePauseResume}
        onDelete={h.setConfirmUri}
      />
    ),
    [colors, h.handlePauseResume, h.setConfirmUri],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowWarm, {backgroundColor: colors.accent.gold, opacity: glowOpacity}]} pointerEvents="none" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton
          onPress={() =>
            navigate('MainTabs', {
              screen: 'LibraryTab',
              params: {screen: 'Library'},
            })
          }
          accessibilityLabel="Back to Library"
        />
        <View style={styles.headerTitleWrap}>
          <AppText variant="h1" color="primary">
            Downloads
          </AppText>
          <AppText variant="caption" color="secondary">
            {h.records.length > 0
              ? `${h.records.length} item${h.records.length === 1 ? '' : 's'}`
              : 'Offline playback'}
          </AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {h.records.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="download"
            title="No downloads yet"
            description="Save tracks and videos to play them without an internet connection."
            actionLabel="Go to Library"
            onAction={() => navigate('MainTabs', {screen: 'LibraryTab', params: {screen: 'Library'}})}
          />
        </View>
      ) : (
        <FlatList
          data={h.records}
          keyExtractor={item => item.uri}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + spacing.lg + 12},
          ]}
          ListHeaderComponent={
            <View>
              {/* ── Storage usage bar ── */}
              {h.storage.loaded && (
                <View style={[styles.card, {backgroundColor: colors.background.elevated}]}>
                  <View style={styles.cardRow}>
                    <AppText variant="body2" color="primary">
                      Storage
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {formatBytes(h.downloadsBytes)} downloaded · {formatBytes(usedBytes)} of {formatBytes(h.storage.total)} used
                    </AppText>
                  </View>
                  <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
                    <View
                      style={[
                        styles.progressFill,
                        {backgroundColor: colors.accent.gold, transform: [{scaleX: storagePct}]},
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* ── Auto-delete policy ── */}
              <View style={styles.policyWrap}>
                <View style={styles.policyHeader}>
                  <AppText variant="body2" color="primary">
                    Auto-delete
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    Keep the last N completed downloads
                  </AppText>
                </View>
                <View style={styles.chipRow}>
                  <FlatList
                    data={POLICY_OPTIONS}
                    keyExtractor={option => String(option.key)}
                    renderItem={({item}) => {
                      const isActive = h.autoDeleteDownloads === item.key;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.chip,
                            {borderColor: isActive ? colors.accent.gold : colors.border.subtle},
                            isActive && {backgroundColor: colors.accent.goldDim},
                          ]}
                          onPress={() => h.handlePolicyChange(item.key)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Auto-delete ${item.label}`}>
                          <AppText
                            variant="caption"
                            color={isActive ? 'accent' : 'secondary'}
                            style={styles.chipLabel}>
                            {item.label}
                          </AppText>
                        </TouchableOpacity>
                      );
                    }}
                    scrollEnabled={false}
                    initialNumToRender={POLICY_OPTIONS.length}
                  />
                </View>
              </View>
            </View>
          }
        />
      )}

      <ConfirmDialog
        visible={h.confirmUri !== null}
        title="Delete download?"
        message={
          h.confirmRecord
            ? `"${h.confirmRecord.title}" will be removed from this device.`
            : 'This download will be removed from this device.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          h.handleDelete();
        }}
        onCancel={() => h.setConfirmUri(null)}
      />
    </SafeAreaView>
  );
};

// ══ Styles ══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {flex: 1},
  glowWarm: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitleWrap: {flex: 1},
  headerSpacer: {width: 44},
  emptyWrap: {flex: 1, justifyContent: 'center'},
  listContent: {paddingHorizontal: spacing.lg, paddingTop: spacing.xs},
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    borderRadius: 2,
  },
  policyWrap: {marginBottom: spacing.md},
  policyHeader: {gap: 2, marginBottom: spacing.sm},
  chipRow: {flexDirection: 'row', gap: spacing.xs},
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 44,
    alignItems: 'center',
  },
  chipLabel: {fontWeight: '600'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm + 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {flex: 1, gap: 1},
  rowTitle: {fontWeight: '600'},
  rowActions: {flexDirection: 'row', gap: spacing.xs},
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
