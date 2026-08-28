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

  const releasePromise = (async () => {
    synchronizer.dispose();
    state.dispose();
    pip.dispose();
    await surface.detach();
    await commands.dispose();
  })();
  // Register the release promise with the lease system so the next
  // `createVideoPlayback()` (in StrictMode or rapid remount) waits
  // for this teardown to finish.
  chainVideoNativeRelease(releasePromise);

  return {
    session,
    commands,
    state,
    synchronizer,
    surface,
    pip,
    release: releasePromise,
  };
}
