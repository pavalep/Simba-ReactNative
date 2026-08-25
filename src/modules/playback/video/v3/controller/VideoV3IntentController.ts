import type {
  VideoV3CommandResult,
  VideoV3Intent,
  VideoV3IntentDispatcher,
} from '../ports/VideoV3Commands';
import type {VideoV3SessionPort} from '../ports/VideoV3SessionPort';
import {VideoV3SeekCoordinator} from './VideoV3SeekCoordinator';

function failure(message: string): VideoV3CommandResult {
  return {ok: false, message};
}

/**
 * Serializes user intent before it reaches native mpv. The controller owns
 * command policy only; it has no React or presentation responsibilities.
 */
export class VideoV3IntentController implements VideoV3IntentDispatcher {
  private tail: Promise<void> = Promise.resolve();
  private readonly seekCoordinator: VideoV3SeekCoordinator;
  private disposed = false;
  private disposePromise: Promise<void> | null = null;

  constructor(private readonly session: VideoV3SessionPort) {
    this.seekCoordinator = new VideoV3SeekCoordinator(session);
  }

  dispatch(intent: VideoV3Intent): Promise<VideoV3CommandResult> {
    if (this.disposed) return Promise.resolve(failure('The video session is closed.'));

    const result = this.tail.then(() => this.execute(intent));
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result.catch(error =>
      failure(error instanceof Error ? error.message : 'The video command failed.'),
    );
  }

  async dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    this.disposed = true;
    this.seekCoordinator.cancel();
    this.disposePromise = this.tail
      .then(() => this.seekCoordinator.dispose())
      .then(() => this.session.release());
    return this.disposePromise;
  }

  private async execute(intent: VideoV3Intent): Promise<VideoV3CommandResult> {
    switch (intent.type) {
      case 'load': {
        const generation = await this.session.load(intent.request);
        return {ok: true, generation};
      }
      case 'refresh':
        await this.session.refresh();
        return {ok: true};
      case 'play':
        await this.session.play();
        return {ok: true};
      case 'pause':
        await this.session.pause();
        return {ok: true};
      case 'seek':
        if (!Number.isFinite(intent.position)) return failure('Seek position is invalid.');
        const seekResult = await this.seekCoordinator.request({
          generation: intent.generation,
          position: intent.position,
        });
        if (seekResult.status === 'cancelled') {
          return failure('The seek was cancelled because the session is closing.');
        }
        return {ok: true};
      case 'set-volume':
        if (!Number.isFinite(intent.volume)) return failure('Volume is invalid.');
        await this.session.setVolume(intent.volume);
        return {ok: true};
      case 'set-muted':
        await this.session.setMuted(intent.muted);
        return {ok: true};
      case 'set-speed':
        if (!Number.isFinite(intent.speed) || intent.speed <= 0) {
          return failure('Playback speed is invalid.');
        }
        await this.session.setSpeed(intent.speed);
        return {ok: true};
      case 'select-track':
        if (!Number.isInteger(intent.trackId)) return failure('Track identity is invalid.');
        await this.session.selectTrack(intent.trackId);
        return {ok: true};
      case 'set-caption-visibility':
        await this.session.setCaptionVisibility(intent.visible);
        return {ok: true};
      case 'release':
        await this.dispose();
        return {ok: true};
    }
  }
}
