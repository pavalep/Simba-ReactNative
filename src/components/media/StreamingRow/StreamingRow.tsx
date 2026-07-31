// ─── Streaming Row ──────────────────────────────────────────────────────
// P39.5: compact streaming-track row (thumb + title + meta + play) shared
// by the "More From This Artist" sections on Artist/Album/Song pages.

import React, {useCallback, useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {DownloadButton} from '../../core/DownloadButton/DownloadButton';
import {MediaActionsSheet} from '../../sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../sheets/MediaActionsSheet/useQueueActions';
import {startDownload} from '../../../services/downloadService';
import {useAppSelector} from '../../../store';
import {selectDownloadedUriSet} from '../../../store/slices/downloadsSlice';
import {useToast} from '../../feedback/Toast/Toast';
import type {JamendoTrackResult} from '../../../types/api';

interface StreamingRowProps {
  track: JamendoTrackResult;
  onPlay: (track: JamendoTrackResult) => void;
  /** 49.5: show the offline download action (badge + download). */
  showDownload?: boolean;
}

export const StreamingRow: React.FC<StreamingRowProps> = React.memo(
  ({track, onPlay, showDownload = false}) => {
    const {colors} = useTheme();
    const toast = useToast();
    const {playNext, addToQueue} = useQueueActions();
    const downloadedUris = useAppSelector(selectDownloadedUriSet);
    const isDownloaded = downloadedUris.has(track.audioUrl);
    // 58.4/58.5: uniform long-press menu (Play Next / Add to Queue / Download)
    const [menuVisible, setMenuVisible] = useState(false);

    const handleMenuPress = useCallback(() => {
      setMenuVisible(true);
    }, []);

    const handleDownload = useCallback(() => {
      startDownload({
        uri: track.audioUrl,
        title: track.name,
        mediaType: 'audio',
        source: 'jamendo',
      }).catch(() => toast.show('Download failed'));
    }, [track, toast]);

    return (
      <>
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => onPlay(track)}
          onLongPress={handleMenuPress}
          delayLongPress={400}
          accessibilityRole="button">
          {track.imageUrl ? (
            <FastImage
              source={{uri: track.imageUrl}}
              style={styles.art}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.art, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="music" size={20} color={colors.accent.gold} />
            </View>
          )}
          <View style={styles.info}>
            <AppText variant="body2" color="primary" numberOfLines={1}>
              {track.name}
            </AppText>
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {track.albumName || track.artistName}
            </AppText>
          </View>
          {showDownload ? (
            <DownloadButton
              uri={track.audioUrl}
              title={track.name}
              mediaType="audio"
              source="jamendo"
              size={16}
            />
          ) : (
            <View style={[styles.playBtn, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="play" size={14} color={colors.accent.gold} />
            </View>
          )}
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={handleMenuPress}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.5}
            accessibilityRole="button"
            accessibilityLabel={`Options for ${track.name}`}>
            <SvgIcon name="sliders" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 58.4: one menu everywhere — Play Next / Add to Queue / Download */}
        <MediaActionsSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          title={track.name}
          subtitle={track.artistName}
          actions={[
            {
              label: 'Play Next',
              icon: 'skipForward',
              onPress: () =>
                playNext({
                  uri: track.audioUrl,
                  title: track.name,
                  duration: track.duration,
                  source: 'jamendo',
                  mediaType: 'audio',
                }),
            },
            {
              label: 'Add to Queue',
              icon: 'list',
              onPress: () =>
                addToQueue({
                  uri: track.audioUrl,
                  title: track.name,
                  duration: track.duration,
                  source: 'jamendo',
                  mediaType: 'audio',
                }),
            },
            {
              label: isDownloaded ? 'Downloaded' : 'Download',
              icon: 'download',
              onPress: isDownloaded ? () => {} : handleDownload,
            },
          ]}
        />
      </>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
