// ─── Downloads — Browse Content ────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header and the surface. This component owns the
// STORAGE card, the AUTO-DELETE policy, the list, and the row.

import React, {useCallback, useMemo} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {ConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {navigate} from '../../../navigation/navigationHelper';
import {formatBytes} from '../../../services/cacheService';
import {useTheme} from '../../../theme';
import {DownloadRow} from './DownloadsRow';
import {useDownloadsData} from './DownloadsDataProvider';
import {createDownloadsScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';
import type {DownloadRecord} from '../../../services/downloadService';
import text from '../related/textContent.json';

/** The auto-delete policy's own options — the service owns the value. */
const POLICY_OPTIONS = [
  {key: 0, label: text.policy.options.off},
  {key: 5, label: text.policy.options['5']},
  {key: 10, label: text.policy.options['10']},
  {key: 25, label: text.policy.options['25']},
  {key: 50, label: text.policy.options['50']},
];

export const DownloadsContent: React.FC<{ctx: SectionRenderContext}> = () => {
  const {colors, isDark} = useTheme();
  const styles = useMemo(() => createDownloadsScreenStyles(), []);
  const bottomChromeInset = useBottomChromeInset();
  const glowOpacity = isDark ? 0.22 : 0.12;
  const {
    records,
    downloadsBytes,
    autoDeleteDownloads,
    storage,
    confirmUri,
    confirmRecord,
    setConfirmUri,
    handlePolicyChange,
    handlePauseResume,
    handleRetry,
    handlePlay,
    handleDelete,
  } = useDownloadsData();

  const usedBytes = useMemo(() => {
    if (!storage.loaded) return 0;
    return Math.max(0, storage.total - storage.free);
  }, [storage]);

  const storagePct = useMemo(() => {
    if (!storage.loaded || storage.total <= 0) return 0;
    return Math.min(1, usedBytes / storage.total);
  }, [storage, usedBytes]);

  const renderItem = useCallback(
    ({item}: {item: DownloadRecord}) => (
      <DownloadRow
        record={item}
        onPauseResume={handlePauseResume}
        onRetry={handleRetry}
        onPlay={handlePlay}
        onDelete={setConfirmUri}
      />
    ),
    [handlePauseResume, handleRetry, handlePlay, setConfirmUri],
  );

  // ── The storage card ────────────────────────────────────────────────
  const storageCard =
    storage.loaded ? (
      <View style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <View style={styles.cardRow}>
          <AppText variant="body2" color="primary">
            {text.storage.title}
          </AppText>
          <AppText variant="caption" color="secondary">
            {text.storage.usage
              .replace('{downloaded}', formatBytes(downloadsBytes))
              .replace('{used}', formatBytes(usedBytes))
              .replace('{total}', formatBytes(storage.total))}
          </AppText>
        </View>
        <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent.gold,
                transform: [{scaleX: storagePct}],
              },
            ]}
          />
        </View>
      </View>
    ) : null;

  // ── The auto-delete policy ──────────────────────────────────────────
  // The policy has TWO halves and the page states both. The age half
  // (30 days) was always enforced by the service with nothing on screen
  // saying so — the page said "keep the last N" and a finished
  // download was deleted at 30 days whatever N was.
  const policy = (
    <View style={styles.policyWrap}>
      <View style={styles.policyHeader}>
        <AppText variant="body2" color="primary">
          {text.policy.title}
        </AppText>
        <AppText variant="caption" color="secondary">
          {text.policy.ageNote}
        </AppText>
        <AppText variant="caption" color="secondary">
          {autoDeleteDownloads > 0
            ? text.policy.keepNote.replace('{count}', String(autoDeleteDownloads))
            : text.policy.keepAllNote}
        </AppText>
      </View>
      <View style={styles.chipRow}>
        {POLICY_OPTIONS.map(option => {
          const isActive = autoDeleteDownloads === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.chip,
                {borderColor: isActive ? colors.accent.gold : colors.border.subtle},
                isActive && {backgroundColor: colors.accent.goldDim},
              ]}
              onPress={() => handlePolicyChange(option.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={text.policy.optionA11y.replace('{label}', option.label)}>
              <AppText
                variant="caption"
                color={isActive ? 'accent' : 'secondary'}
                style={styles.chipLabel}>
                {option.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.sectionRoot}>
      {/* The warm glow the page wore before it joined the shell. The
          shell owns the surface now, and its header is opaque, so the
          glow sits at the top-right of the CONTENT. */}
      <View
        style={[styles.glowWarm, {backgroundColor: colors.accent.gold, opacity: glowOpacity}]}
        pointerEvents="none"
      />

      <FlatList
        testID="section-Downloads-list"
        data={records}
        keyExtractor={item => item.uri}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset},
        ]}
        ListHeaderComponent={
          <View>
            {storageCard}
            {policy}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="download"
              title={text.states.emptyTitle}
              description={text.states.emptyMessage}
              actionLabel={text.states.emptyAction}
              onAction={() => navigate('Library')}
            />
          </View>
        }
      />

      <ConfirmDialog
        visible={confirmUri !== null}
        title={text.dialog.title}
        message={
          confirmRecord
            ? text.dialog.message.replace('{title}', confirmRecord.title)
            : text.dialog.messageGeneric
        }
        confirmLabel={text.dialog.confirmLabel}
        cancelLabel={text.dialog.cancelLabel}
        destructive
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setConfirmUri(null)}
      />
    </View>
  );
};