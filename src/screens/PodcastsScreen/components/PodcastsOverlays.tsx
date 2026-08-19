// ─── Podcasts — Status Overlays ───────────────────────────────────────
// Floating status pills layered ABOVE the list area: a centered "loading"
// pill while a fresh scope resolves, and a top "refreshing" pill during
// pull-to-refresh. All overlays are pointerEvents="none" — pure status,
// never interactive.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {createPodcastsOverlaysStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  isLoading: boolean;
  hasLoaded: boolean;
  /** No rows for the current scope (fresh filter/search while loading). */
  isEmpty: boolean;
}

export const PodcastsOverlays: React.FC<Props> = ({
  isLoading,
  hasLoaded,
  isEmpty,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createPodcastsOverlaysStyles(colors), [colors]);

  // First resolve of a scope (initial mount OR applying a filter that
  // hasn't been cached yet): the centered pill REPLACES the list area.
  if (!hasLoaded && isLoading) {
    return (
      <View style={styles.centerLoader} pointerEvents="none">
        <View style={styles.centerLoaderPill}>
          <ActivityOrb size={24} />
          <AppText
            variant="caption"
            color="secondary"
            style={styles.centerLoaderText}>
            {text.pills.loading}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Pull-to-refresh on a loaded scope: items stay visible underneath
          while a floating pill confirms the refresh is in-flight. */}
      {hasLoaded && isLoading ? (
        <View style={styles.refreshPillWrap} pointerEvents="none">
          <View style={styles.refreshPill}>
            <ActivityOrb size={20} />
            <AppText
              variant="caption"
              color="secondary"
              style={styles.refreshPillText}>
              {text.pills.refreshing}
            </AppText>
          </View>
        </View>
      ) : null}
      {/* If items are empty AND we're loading (filter applied while prior
          items were for a different scope, search re-running, etc.), the
          centered pill stays on — it floats over whatever the list
          shows. */}
      {isEmpty && isLoading ? (
        <View style={styles.centerLoader} pointerEvents="none">
          <View style={styles.centerLoaderPill}>
            <ActivityOrb size={24} />
            <AppText
              variant="caption"
              color="secondary"
              style={styles.centerLoaderText}>
              {text.pills.loading}
            </AppText>
          </View>
        </View>
      ) : null}
    </>
  );
};
