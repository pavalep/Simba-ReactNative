import {VideoIntentController} from '../controller/VideoIntentController';
import {createVideoPlatformCapabilities} from '../infrastructure/VideoPlatformCapabilities';
import {VideoNativeStateSynchronizer} from '../state/VideoNativeStateSynchronizer';
import {VideoStateAdapter} from '../state/VideoStateAdapter';
import {VideoMpvSession} from './VideoMpvSession';
import {VideoSurfaceController} from '../surface/VideoSurfaceController';
import {VideoPipAdapter} from '../platform/VideoPipAdapter';

/**
 * Builds one independent V3 playback unit. The returned objects are designed
 * to be injected into a future presentation host rather than imported by UI
 * components directly.
 */
export function createVideoPlayback() {
  const session = new VideoMpvSession();
  const commands = new VideoIntentController(session);
  const state = new VideoStateAdapter(
    session,
    createVideoPlatformCapabilities(),
  );
  const synchronizer = new VideoNativeStateSynchronizer(session);
  const surface = new VideoSurfaceController();
  const pip = new VideoPipAdapter();

  return {
    session,
    commands,
    state,
    synchronizer,
    surface,
    pip,
    async release(): Promise<void> {
      synchronizer.dispose();
      state.dispose();
      pip.dispose();
      await surface.detach();
      await commands.dispose();
    },
  };
}
