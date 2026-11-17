// ─── Podcasts — overlay pill styles ───────────────────────────────────
// Floating status pills rendered by components/PodcastsOverlays.
//
// The pill's GEOMETRY belongs to the shared loading state
// (`screens/_shared/BrowseLoadingState.tsx`) — this file owns only the
// OVERLAY's own box: the layer that floats above the list.

import {StyleSheet} from 'react-native';

export const createPodcastsOverlaysStyles = () =>
  StyleSheet.create({
    centerLoader: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      // The shared loading state anchors its own pill at ~20 % from the
      // top of the area it is given, so it reads as a status pill and not
      // as a splash-screen placeholder. This layer is only the box it
      // floats in.
      justifyContent: 'flex-start',
      zIndex: 10,
    },
  });
