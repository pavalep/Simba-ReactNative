import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../store';
import {MiniAudioPlayer} from '../../components/player/MiniAudioPlayer/MiniAudioPlayer';
import {usePlaybackState} from './PlaybackContext';
import {AudioPlayerModule} from './audio/AudioPlayerModule';
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

  if (presentation === 'mini') {
    return (
      <View pointerEvents="box-none" style={styles.miniLayer}>
        <MiniAudioPlayer overTabBar={false} />
      </View>
    );
  }

  return (
    <View style={styles.fullscreenLayer} pointerEvents="box-none">
      {lane === 'video' ? (
        <VideoPlayerModule active={active} />
      ) : (
        <AudioPlayerModule active={active} />
      )}
    </View>
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
});
