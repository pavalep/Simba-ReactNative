import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../store';
import {usePlaybackState} from './PlaybackContext';
import {TransportProvider} from '../../contexts/TransportContext';
import {AudioModule, MiniAudio} from './audio';
import {AudioPlaybackControllerProvider} from './audio/AudioPlaybackControllerContext';
import {VideoHost} from './video';

/**
 * Root-level playback presentation host.
 *
 * Playback remains independent from navigation. Video uses the session and
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
        <VideoHost active={active} />
      </View>
    );
  }

  const audioPresentation = presentation === 'mini' ? 'mini' : 'expanded';
  return (
    <TransportProvider>
      <AudioPlaybackControllerProvider active={active}>
        <View
          style={audioPresentation === 'expanded' ? styles.fullscreenLayer : styles.controllerLayer}
          pointerEvents={audioPresentation === 'expanded' ? 'box-none' : 'none'}
        >
          <AudioModule active={active} presentation={audioPresentation} />
        </View>
        {presentation === 'mini' ? (
          <View pointerEvents="box-none" style={styles.miniLayer}>
            <MiniAudio />
          </View>
        ) : null}
      </AudioPlaybackControllerProvider>
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
