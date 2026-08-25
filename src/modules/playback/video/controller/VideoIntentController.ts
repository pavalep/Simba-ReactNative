import type {
  VideoCommandResult,
  VideoIntent,
  VideoIntentDispatcher,
} from '../ports/VideoCommands';
import type {VideoSessionPort} from '../ports/VideoSessionPort';
import {VideoSeekCoordinator} from './VideoSeekCoordinator';

function failure(message: string): VideoCommandResult {
  return {ok: false, message};
}

/**
 * Serializes user intent before it reaches native mpv. The controller owns
 * command policy only; it has no React or presentation responsibilities.
 */
export class VideoIntentController implements VideoIntentDispatcher {
  private tail: Promise<void> = Promise.resolve();
  private readonly seekCoordinator: VideoSeekCoordinator;
  private disposed = false;
  private disposePromise: Promise<void> | null = null;

  constructor(private readonly session: VideoSessionPort) {
    this.seekCoordinator = new VideoSeekCoordinator(session);
  }

  dispatch(intent: VideoIntent): Promise<VideoCommandResult> {
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
    const queuedCommands = this.tail;
    this.disposePromise = queuedCommands
      .then(() => this.disposeResources());
    return this.disposePromise;
  }

  private async disposeFromQueuedRelease(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    this.disposed = true;
    this.seekCoordinator.cancel();
    // This method runs as the current queue item. It must not await `tail`,
    // because `tail` already contains the current release command.
    this.disposePromise = this.disposeResources();
    return this.disposePromise;
  }

  private async disposeResources(): Promise<void> {
    await this.seekCoordinator.dispose();
    await this.session.release();
  }

  private async execute(intent: VideoIntent): Promise<VideoCommandResult> {
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
        await this.disposeFromQueuedRelease();
        return {ok: true};
    }
  }
}
