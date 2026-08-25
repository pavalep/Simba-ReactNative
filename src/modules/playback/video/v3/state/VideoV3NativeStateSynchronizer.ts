import type {
  VideoV3SessionEvent,
  VideoV3SessionPort,
  VideoV3Unsubscribe,
} from '../ports/VideoV3SessionPort';

/**
 * Reconciles event-driven updates with mpv's synchronous properties at
 * lifecycle boundaries. It deliberately avoids a polling loop in Wave B.
 */
export class VideoV3NativeStateSynchronizer {
  private readonly unsubscribeSession: VideoV3Unsubscribe;
  private refreshTail: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly session: VideoV3SessionPort) {
    this.unsubscribeSession = session.subscribe(event => this.handleEvent(event));
  }

  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.refreshTail = this.refreshTail
      .catch(() => undefined)
      .then(() => this.session.refresh());
    return this.refreshTail;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeSession();
  }

  private handleEvent(event: VideoV3SessionEvent): void {
    if (
      event.type === 'file-loaded' ||
      event.type === 'surface-attached' ||
      event.type === 'first-frame' ||
      event.type === 'ended'
    ) {
      this.refresh().catch(() => undefined);
    }
  }
}
