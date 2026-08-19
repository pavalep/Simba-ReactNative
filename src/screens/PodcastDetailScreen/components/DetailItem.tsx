// ─── Podcast Detail — Episode List Item ───────────────────────────────
// One episode row: title, publish date + duration, two-line description,
// per-episode playback progress and the play button. Long-press opens the
// action sheet (play next / queue / playlist / bookmark / share).

import React, {useMemo} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createDetailItemStyles} from '../styles';
import text from '../related/textContent.json';
import type {PodcastEpisodeResult} from '../../../types/api';

interface Props {
  episode: PodcastEpisodeResult;
  /** 0..1 playback progress for this episode's enclosure URL. */
  progress: number | undefined;
  onPress: () => void;
  onLongPress: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return text.episode.zeroDuration;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}min`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export const DetailItem: React.FC<Props> = ({
  episode,
  progress,
  onPress,
  onLongPress,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createDetailItemStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.episodeCard}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityLabel={text.episode.playAccessibility.replace(
        '{title}',
        episode.title,
      )}
      accessibilityRole="button">
      <View style={styles.episodeInfo}>
        <AppText
          variant="body2"
          color="primary"
          style={styles.episodeTitle}
          numberOfLines={1}>
          {episode.title}
        </AppText>

        <View style={styles.episodeMeta}>
          <AppText variant="caption" color="tertiary">
            {formatDate(episode.datePublished)}
          </AppText>
          {episode.duration > 0 && (
            <>
              <AppText variant="caption" color="tertiary">
                {text.episode.metaSeparator}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {formatDuration(episode.duration)}
              </AppText>
            </>
          )}
        </View>

        {episode.description ? (
          <AppText
            variant="caption"
            color="secondary"
            style={styles.episodeDescription}
            numberOfLines={2}>
            {episode.description.replace(/<[^>]*>/g, '')}
          </AppText>
        ) : null}

        {!progress ? null : progress >= 0.95 ? (
          <AppText variant="caption" style={styles.playedText}>
            {text.episode.played}
          </AppText>
        ) : (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {width: `${Math.round(progress * 100)}%`},
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.playButton}>
        <SvgIcon name="play" size={20} color={colors.accent.gold} />
      </View>
    </TouchableOpacity>
  );
};
