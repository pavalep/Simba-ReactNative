import {VideoV3IntentController} from '../controller/VideoV3IntentController';
import {createVideoV3PlatformCapabilities} from '../infrastructure/VideoV3PlatformCapabilities';
import {VideoV3NativeStateSynchronizer} from '../state/VideoV3NativeStateSynchronizer';
import {VideoV3StateAdapter} from '../state/VideoV3StateAdapter';
import {VideoV3MpvSession} from './VideoV3MpvSession';
import {VideoV3SurfaceController} from '../surface/VideoV3SurfaceController';
import {VideoV3PipAdapter} from '../platform/VideoV3PipAdapter';

/**
 * Builds one independent V3 playback unit. The returned objects are designed
 * to be injected into a future presentation host rather than imported by UI
 * components directly.
 */
export function createVideoV3Playback() {
  const session = new VideoV3MpvSession();
  const commands = new VideoV3IntentController(session);
  const state = new VideoV3StateAdapter(
    session,
    createVideoV3PlatformCapabilities(),
  );
  const synchronizer = new VideoV3NativeStateSynchronizer(session);
  const surface = new VideoV3SurfaceController();
  const pip = new VideoV3PipAdapter();

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
