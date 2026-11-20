// ─── Downloads — the download row ───────────────────────────────────────
// One download, and the actions that download's state allows.
//
// WAVE B16 (Wave B2) — this file is new. The row used to live inside
// the screen component.

import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {formatBytes} from '../../../services/cacheService';
import {useTheme} from '../../../theme';
import type {DownloadRecord} from '../../../services/downloadService';
import {createDownloadsScreenStyles} from '../styles';
import text from '../related/textContent.json';

/**
 * The row's second line — what the download is doing.
 */
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
      return 'Paused';
    case 'done':
      return formatBytes(record.size);
    case 'error':
      return record.error ? `Failed · ${record.error}` : 'Failed';
    default:
      return '';
  }
}

/**
 * How far the download has got.
 */
 function progressOf(record: DownloadRecord): number {
  if (record.size <= 0) return 0;
  return Math.min(1, record.received / record.size);
}

interface DownloadRowProps {
  record: DownloadRecord;
  onPauseResume: (uri: string, status: string) => void;
  onRetry: (uri: string) => void;
  onPlay: (record: DownloadRecord) => void;
  onDelete: (uri: string) => void;
};

export const DownloadRow: React.FC<DownloadRowProps> = React.memo(
  ({record, onPauseResume, onRetry, onPlay, onDelete}) => {
    const {colors} = useTheme();
    const styles = createDownloadsScreenStyles();
    const active = record.status === 'downloading';
    const paused = record.status === 'paused';
    const failed = record.status === 'error';
    const done = record.status === 'done';
    const progress = progressOf(record);

    const body = (
      <>
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
      </>
    );

    return (
      <View style={[styles.row, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.iconCircle, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon
            name={record.mediaType === 'video' ? 'video' : 'music'}
            size={18}
            color={colors.accent.gold}
          />
        </View>

        {/* Only a FINISHED download is playable — a half-downloaded file
            cannot be opened — so only that row's body is pressable. Every
            other state keeps a plain `View`, which neither looks nor
            behaves like a control. */}
        {done ? (
          <TouchableOpacity
            style={styles.rowBody}
            onPress={() => onPlay(record)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={text.row.playLabel.replace('{title}', record.title)}>
            {body}
          </TouchableOpacity>
        ) : (
          <View style={styles.rowBody}>{body}</View>
        )}

        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
            onPress={() => {
              if (done) onPlay(record);
              else if (failed) onRetry(record.uri);
              else onPauseResume(record.uri, record.status);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              done
                ? text.row.actionLabel
                : failed
                  ? text.row.retryLabel
                  : active
                    ? text.row.pauseLabel
                    : text.row.resumeLabel
            }>
            <SvgIcon
              name={done ? 'play' : failed ? 'replay' : active ? 'pause' : 'download'}
              size={16}
              color={colors.accent.gold}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
            onPress={() => onDelete(record.uri)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={text.row.deleteLabel}>
            <SvgIcon name="close" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);