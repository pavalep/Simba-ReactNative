import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../store';
import {usePlaybackState} from './PlaybackContext';
import {TransportProvider} from '../../contexts/TransportContext';
import {AudioV2Module, MiniAudioV2} from './audio/v2';
import {VideoV3Host} from './video/v3';

/**
 * Root-level playback presentation host.
 *
 * Playback remains independent from navigation. Video uses the V3 session and
 * surface host; audio retains its own transport provider and presentation lane.
 */
export const PlaybackOverlayHost: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const {active, lane, presentation} = usePlaybackState();

  if (!isAuthenticated || !active || presentation === 'none') return null;

  if (lane === 'video') {
    return (
      <View
        style={presentation === 'mini' ? styles.miniLayer : styles.fullscreenLayer}
        pointerEvents="box-none"
      >
        <VideoV3Host active={active} />
      </View>
    );
  }

  const audioPresentation = presentation === 'mini' ? 'mini' : 'expanded';
  return (
    <TransportProvider>
      <View
        style={audioPresentation === 'expanded' ? styles.fullscreenLayer : styles.controllerLayer}
        pointerEvents={audioPresentation === 'expanded' ? 'box-none' : 'none'}
      >
        <AudioV2Module active={active} presentation={audioPresentation} />
      </View>
      {presentation === 'mini' ? (
        <View pointerEvents="box-none" style={styles.miniLayer}>
          <MiniAudioV2 />
        </View>
      ) : null}
    </TransportProvider>
  );
};

const styles = StyleSheet.create({
  fullscreenLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
  miniLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 90,
    elevation: 90,
  },
  controllerLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    elevation: 80,
  },
});
