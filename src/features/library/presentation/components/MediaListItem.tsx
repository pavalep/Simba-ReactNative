import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {AppCard} from '../../../../components/core/AppCard/AppCard';
import {
  MediaActionsSheet,
  type MediaAction,
} from '../../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../../components/sheets/MediaActionsSheet/useQueueActions';
import type {MediaKind, MediaLane, MediaSource} from '../../../../types/media';

interface MediaListItemProps {
  /**
   * The row's identity. In the Library this IS the media file's URI
   * (`ScannedTrack.uri`) — the queue and the playlist both need it, so the
   * row never re-derives it.
   */
  id: string;
  title: string;
  /**
   * DURATION IN MILLISECONDS — the unit this row DISPLAYS in.
   * (`LibraryAudioSegment` passes the scanner's seconds × 1000.)
   */
  duration: number;
  artist?: string;
  /**
   * The scanner's classification, passed down unchanged. The queue and the
   * playlist must carry the real kind, not a re-derived guess.
   */
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  folderId?: string;
  isSelected?: boolean;
  selectionMode?: boolean;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
  /**
   * Opens the app's ONE playlist picker (`PlaylistSheet`) for this row.
   * Required on purpose: a menu action that cannot act must not be offered.
   */
  onAddToPlaylist: () => void;
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const THUMBNAIL_SIZE = 48;

const MediaListItem: React.FC<MediaListItemProps> = React.memo(
  (
    {
      id,
      title,
      duration,
      artist,
      source,
      type,
      mediaType,
      provider,
      folderId,
      isSelected,
      selectionMode,
      onPress,
      onLongPress,
      onAddToPlaylist,
    },
  ) => {
    const {colors} = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);
    // The ONE wrapper for "put this in the queue": it calls the queue store
    // AND shows the toast. A row must never call the queue store directly —
    // the toast is part of the action.
    const {playNext, addToQueue} = useQueueActions();

    const showSelectionIndicator = selectionMode && isSelected;

    const handleLongPress = useCallback(() => {
      if (onLongPress) {
        onLongPress(id);
      } else {
        setMenuVisible(true);
      }
    }, [id, onLongPress]);

    /**
     * THE UNIT BOUNDARY.
     *
     * `duration` (the prop above) is MILLISECONDS — it is the row's display
     * unit. The queue's duration is SECONDS (`PlayerQueueItem.duration`; the
     * Queue screen formats it as seconds), and so is `PlaylistItem.duration`.
     * This is the ONE conversion from milliseconds to seconds, and it happens
     * here, at the seam between the row and the queue.
     */
    const durationSeconds = duration / 1000;

    const queueItem = useMemo(
      () => ({
        uri: id,
        title,
        duration: durationSeconds,
        source,
        type,
        mediaType,
        ...(provider ? {provider} : {}),
        ...(folderId ? {folderId} : {}),
      }),
      [id, title, durationSeconds, source, type, mediaType, provider, folderId],
    );

    // Every row of this menu DOES something. There is no "Info" entry:
    // the app has no media-info surface for a local file, and a row that
    // leads nowhere is worse than no row.
    const actions = useMemo<MediaAction[]>(
      () => [
        {
          label: 'Play',
          icon: 'play',
          onPress: () => onPress(id),
        },
        {
          label: 'Play Next',
          icon: 'skipForward',
          onPress: () => playNext(queueItem),
        },
        {
          label: 'Add to Queue',
          icon: 'list',
          onPress: () => addToQueue(queueItem),
        },
        {
          label: 'Add to Playlist',
          icon: 'listMusic',
          onPress: () => onAddToPlaylist(),
        },
      ],
      [addToQueue, id, onAddToPlaylist, onPress, playNext, queueItem],
    );

    return (
      <>
        <AppCard
          elevated
          active={showSelectionIndicator}
          onPress={() => onPress(id)}
          onLongPress={handleLongPress}
          style={styles.container}>
          {showSelectionIndicator ? (
            <View
              style={[
                styles.selectionCircle,
                {
                  backgroundColor: colors.accent.gold,
                  borderColor: colors.accent.gold,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.thumbnail,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText
                variant="body2"
                style={[styles.thumbnailText, {color: colors.text.primary}]}>
                {title.charAt(0).toUpperCase()}
              </AppText>
            </View>
          )}
          <View style={styles.content}>
            <AppText
              variant="body2"
              color="primary"
              numberOfLines={1}>
              {title}
            </AppText>
            {artist ? (
              <AppText
                variant="caption"
                color="secondary"
                numberOfLines={1}
                style={{marginTop: spacing.xs}}>
                {artist}
              </AppText>
            ) : null}
          </View>
          <View style={styles.right}>
            <AppText variant="caption" color="secondary">
              {formatDuration(duration)}
            </AppText>
          </View>
        </AppCard>

        {/* The app's ONE media menu — not a second copy of it. */}
        <MediaActionsSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          title={title}
          subtitle={artist}
          actions={actions}
        />
      </>
    );
  },
);

export const ITEM_HEIGHT = 66;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  thumbnailText: {
    fontWeight: '700',
  },
  selectionCircle: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  right: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
});

export default MediaListItem;
