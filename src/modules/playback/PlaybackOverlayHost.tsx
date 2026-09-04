import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../store';
import {usePlaybackState} from './PlaybackContext';
import {TransportProvider} from '../../contexts/TransportContext';
import {AudioModule, MiniAudio} from './audio';
import {AudioPlaybackControllerProvider} from './audio/AudioPlaybackControllerContext';
import {VideoHost} from './video';
// ── Phase 43 conditional-render refactor ──────────────────────────
// V12 ships playback UI inside its own dedicated Android activity
// (`PlayerActivity`). When `USE_DEDICATED_PLAYER_ACTIVITY` is `true`
// (the V12 default since Phase 41), all 40+ openPlayer() entry points
// launch `PlayerActivity` directly via `MpvPlayer.openPlayer(...)` and
// never set the inline `active` state — so `PlaybackOverlayHost`
// would mount nothing anyway. We short-circuit it explicitly here to:
//
//   1. Make the V12-default no-render path self-documenting
//   2. Guarantee the V11 `VideoHost` / `AudioModule` / `MiniAudio`
//      tree is never mounted when V12 is the active path (zero React
//      reconciliation cost + zero risk of a stale mount racing with
//      PlayerActivity's own React root)
//   3. Keep the emergency rollback trivial — flipping the flag back
//      to `false` re-enables this host's V11 rendering with no other
//      changes needed.
//
// Phase 47 deletes this entire component (along with `VideoHost` +
// `AudioModule` + `VideoNativeSurface` + `VideoSurfaceGestures`).
// See [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) §3 + §5.
import {USE_DEDICATED_PLAYER_ACTIVITY} from '../../lib/flags';

/**
 * Root-level playback presentation host.
 *
 * Playback remains independent from navigation. Video uses the session and
 * surface host; audio retains its own transport provider and presentation lane.
 *
 * **Phase 43 (Wave 8):** gated behind `USE_DEDICATED_PLAYER_ACTIVITY`. When
 * the flag is `true`, the V12 dedicated-activity path owns the player UI and
 * this host short-circuits to `null`. When `false`, the V11 inline-mount
 * path runs (used as the emergency rollback).
 */
export const PlaybackOverlayHost: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const {active, lane, presentation} = usePlaybackState();

  // Phase 43: V12 default — no inline host. PlayerActivity handles the UI.
  if (USE_DEDICATED_PLAYER_ACTIVITY) return null;

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
