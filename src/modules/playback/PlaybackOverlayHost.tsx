import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../store';
import {usePlaybackState} from './PlaybackContext';
import {TransportProvider} from '../../contexts/TransportContext';
import {AudioV2Module, MiniAudioV2} from './audio/v2';
import {VideoPlayerModule} from './video/VideoPlayerModule';

/**
 * Root-level playback presentation host.
 *
 * The playback engine is independent from navigation. This host only decides
 * which visual presentation is currently visible over the active root route.
 */
export const PlaybackOverlayHost: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const {active, lane, presentation} = usePlaybackState();

  // Never expose user playback controls over Splash/Login. The provider may
  // remain mounted across auth transitions for lifecycle continuity.
  if (!isAuthenticated || !active || presentation === 'none') return null;
  const audioPresentation = presentation === 'mini' ? 'mini' : 'expanded';

  return (
    <TransportProvider>
      {lane === 'video' ? (
        <View style={styles.fullscreenLayer} pointerEvents="box-none">
          <VideoPlayerModule active={active} />
        </View>
      ) : (
        <>
          <View style={audioPresentation === 'expanded' ? styles.fullscreenLayer : styles.controllerLayer} pointerEvents={audioPresentation === 'expanded' ? 'box-none' : 'none'}>
            <AudioV2Module active={active} presentation={audioPresentation} />
          </View>
          {presentation === 'mini' ? (
            <View pointerEvents="box-none" style={styles.miniLayer}>
              <MiniAudioV2 />
            </View>
          ) : null}
        </>
      )}
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
