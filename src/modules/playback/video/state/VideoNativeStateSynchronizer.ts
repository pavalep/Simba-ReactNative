import type {
  VideoSessionEvent,
  VideoSessionPort,
  VideoUnsubscribe,
} from '../ports/VideoSessionPort';

/**
 * Reconciles event-driven updates with mpv's synchronous properties at
 * lifecycle boundaries. It deliberately avoids a polling loop in Wave B.
 */
export class VideoNativeStateSynchronizer {
  private readonly unsubscribeSession: VideoUnsubscribe;
  private refreshTail: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly session: VideoSessionPort) {
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

  private handleEvent(event: VideoSessionEvent): void {
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
