// ─── Podcasts — Status Overlays ───────────────────────────────────────
//
// The overlays float ABOVE the list in every state — a long press can
// only happen while the list is up, but a scope change must not unmount
// an open sheet mid-gesture.
//
// THE REFRESH PILL IS GONE
// -----------------------
// This file used to draw a floating "Refreshing…" pill whenever the
// QUERY was fetching. The query fetches for three different reasons —
// the first page, the NEXT PAGE, and a pull-to-refresh — and the pill
// could not tell them apart, so scrolling to the end of the list popped
// a "Refreshing…" pill at the top of the screen for a page load the user
// never called a refresh.
//
// The house's refresh indicator is the platform's own `RefreshControl`,
// and the shared `usePullToRefresh` owner (`screens/_shared/
// pullToRefresh.ts`) binds it to the GESTURE — so it is on exactly while
// a pull the user started is running. This screen has that control
// (`PodcastsContent.tsx`). One indicator, one owner, and it says what it
// means.
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`).

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {BrowseLoadingState} from '../../_shared/BrowseLoadingState';
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
  const styles = useMemo(() => createPodcastsOverlaysStyles(), []);

  // First resolve of a scope (initial mount OR applying a filter that
  // hasn't been cached yet): the centered pill REPLACES the list area.
  if (!hasLoaded && isLoading) {
    return (
      <View style={styles.centerLoader} pointerEvents="none">
        <BrowseLoadingState label={text.pills.loading} />
      </View>
    );
  }

  return (
    <>
      {/* If items are empty AND we're loading (filter applied while prior
          items were for a different scope, search re-running, etc.), the
          centered pill stays on — it floats over whatever the list
          shows. */}
      {isEmpty && isLoading ? (
        <View style={styles.centerLoader} pointerEvents="none">
          <BrowseLoadingState label={text.pills.loading} />
        </View>
      ) : null}
    </>
  );
};
