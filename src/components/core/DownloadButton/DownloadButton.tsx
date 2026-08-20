import React, {useCallback, useMemo} from 'react';

import {StyleSheet, TouchableOpacity, View, ViewStyle} from 'react-native';

import {useTheme} from '../../../theme';
import {useAppSelector} from '../../../store';
import {selectDownloadByUri} from '../../../store/slices/downloadsSlice';
import {downloadService} from '../../../services/downloadService';
import {navigate} from '../../../navigation/navigationHelper';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';

import {useDownloadsSync} from '../../../hooks/useDownloadsSync';

import {useHaptics} from '../../../hooks/useHaptics';
import {SvgIcon, SvgIconName} from '../../utility/SvgIcon';

/**
 * 49.2: core download action button (idle / downloading / paused / done /
 * error). Double duty as the offline badge (49.5): a completed download shows
 * a check so any surface with this button advertises offline availability.
 *
 * - idle    → start download
 * - active  → pause
 * - paused  → resume
 * - error   → retry
 * - done    → open the Downloads screen (delete lives there)
 */
export interface DownloadButtonProps {
  uri: string;
  title: string;
    mediaType?: MediaLane;
  type?: MediaKind;
  source?: MediaSource;
  provider?: string;

  size?: number;
  style?: ViewStyle;
}

const TRACK_WIDTH = 28;

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  uri,
  title,
  mediaType,
  type,
  source,
  provider,
  size = 20,
  style,
}) => {
  const {colors} = useTheme();
  const record = useAppSelector(selectDownloadByUri(uri));
  useDownloadsSync();
  const {medium} = useHaptics();

  const handlePress = useCallback(() => {
    if (!record || record.status === 'idle') {
      medium();
            downloadService.startDownload({uri, title, mediaType, type, source, provider});

      return;
    }
    switch (record.status) {
      case 'downloading':
        downloadService.pauseDownload(uri);
        break;
      case 'paused':
      case 'error':
        medium();
        downloadService.resumeDownload(uri);
        break;
      case 'done':
        navigate('Downloads');
        break;
      default:
        break;
    }
  }, [record, uri, title, mediaType, type, source, provider, medium]);

  const {icon, color, progress} = useMemo(() => {
    const status = record?.status ?? 'idle';
    const pct =
      record && record.size > 0
        ? Math.min(1, record.received / record.size)
        : 0;
    let iconName: SvgIconName = 'download';
    let tint = colors.text.secondary;
    switch (status) {
      case 'downloading':
        iconName = 'pause';
        tint = colors.accent.gold;
        break;
      case 'paused':
        iconName = 'download';
        tint = colors.text.secondary;
        break;
      case 'done':
        iconName = 'check';
        tint = colors.semantic.success;
        break;
      case 'error':
        iconName = 'alertCircle';
        tint = colors.semantic.error;
        break;
      default:
        break;
    }
    return {icon: iconName, color: tint, progress: status === 'done' ? 1 : pct};
  }, [record, colors]);

  const accessibilityLabel = useMemo(() => {
    const status = record?.status ?? 'idle';
    switch (status) {
      case 'downloading':
        return 'Pause download';
      case 'paused':
        return 'Resume download';
      case 'done':
        return 'Downloaded — open Downloads';
      case 'error':
        return 'Download failed — retry';
      default:
        return 'Download for offline';
    }
  }, [record]);

  return (
    <TouchableOpacity
      style={[styles.btn, {borderColor: colors.border.subtle, backgroundColor: colors.background.elevated}, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <SvgIcon name={icon} size={size} color={color} />
      {(record?.status === 'downloading' || record?.status === 'paused') && (
        <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
          <View
            style={[
              styles.progressFill,
              {backgroundColor: colors.accent.gold, transform: [{scaleX: progress}]},
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    width: TRACK_WIDTH,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TRACK_WIDTH,
    height: 2,
    borderRadius: 1,
  },
});
