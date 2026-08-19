// ─── Podcast Detail — List States ─────────────────────────────────────
// Renders through the FlatList ListEmptyComponent so loading, error and
// the empty state share one layout path — no flicker when the API resolves.

import React, {useMemo} from 'react';
import {TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {createListStatesStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  isLoading: boolean;
  error: string | null;
  /** Whether the podcast meta resolved — drives the "not found" state. */
  hasPodcast: boolean;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  isLoading,
  error,
  hasPodcast,
  onRetry,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createListStatesStyles(colors), [colors]);

  if (isLoading) {
    return (
      <Placeholder
        variant="loading"
        anchor="center"
        title={text.listStates.loading}
      />
    );
  }

  if (error || !hasPodcast) {
    return (
      <Placeholder
        variant="empty"
        anchor="center"
        icon="alertCircle"
        iconColor={colors.semantic.error}
        title={error ?? text.listStates.podcastNotFound}
        message={text.listStates.connectionError}>
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.7}
          onPress={onRetry}
          accessibilityLabel={text.listStates.retry}
          accessibilityRole="button">
          <AppText variant="button" style={styles.retryText}>
            {text.listStates.retry}
          </AppText>
        </TouchableOpacity>
      </Placeholder>
    );
  }

  return (
    <Placeholder
      variant="empty"
      anchor="top"
      icon="music"
      title={text.listStates.noEpisodesTitle}
      message={text.listStates.noEpisodesMessage}
      style={styles.episodesEmpty}
    />
  );
};
