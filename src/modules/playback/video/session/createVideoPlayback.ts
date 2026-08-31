import {VideoIntentController} from '../controller/VideoIntentController';
import {createVideoPlatformCapabilities} from '../infrastructure/VideoPlatformCapabilities';
import {VideoNativeStateSynchronizer} from '../state/VideoNativeStateSynchronizer';
import {VideoStateAdapter} from '../state/VideoStateAdapter';
import {VideoMpvSession} from './VideoMpvSession';
import {VideoSurfaceController} from '../surface/VideoSurfaceController';
import {VideoPipAdapter} from '../platform/VideoPipAdapter';
import {chainVideoNativeRelease, waitForVideoNativeRelease} from './VideoNativeLease';

/**
 * Builds one independent V3 playback unit. The returned objects are designed
 * to be injected into a future presentation host rather than imported by UI
 * components directly.
 */
export async function createVideoPlayback() {
  // L2: StrictMode in development mounts every effect twice. The first
  // mount creates `playback1` and the cleanup is queued. The second
  // mount runs before `playback1.release()` has finished its stop +
  // destroy microtasks. We wait here so the new session's
  // `initPlayer()` doesn't race the old session's `destroy()` on the
  // shared native handle.
  await waitForVideoNativeRelease();
  const session = new VideoMpvSession();
  const commands = new VideoIntentController(session);
  const state = new VideoStateAdapter(
    session,
    createVideoPlatformCapabilities(),
  );
  const synchronizer = new VideoNativeStateSynchronizer(session);
  const surface = new VideoSurfaceController();
  const pip = new VideoPipAdapter();

  // FIX (v11 hotfix): the teardown used to be an immediately-invoked
  // async IIFE, which disposed the unit (state subscription, surface,
  // commands) at BIRTH — the player never loaded anything. Teardown
  // must be lazy and idempotent: it starts when the host calls
  // `release()` from cleanup, and only then is it chained into the
  // lease system so the next mount waits for it.
  let releasePromise: Promise<void> | null = null;
  const release = (): Promise<void> => {
    if (!releasePromise) {
      releasePromise = (async () => {
        synchronizer.dispose();
        state.dispose();
        pip.dispose();
        await surface.detach();
        await commands.dispose();
      })();
      chainVideoNativeRelease(releasePromise);
    }
    return releasePromise;
  };

  return {
    session,
    commands,
    state,
    synchronizer,
    surface,
    pip,
    release,
  };
}
