import type {
  VideoV3SeekRequest,
  VideoV3SessionPort,
} from '../ports/VideoV3SessionPort';

export type VideoV3SeekResult =
  | {status: 'applied'; requestId: number}
  | {status: 'superseded'; requestId: number}
  | {status: 'cancelled'; requestId: number};

/**
 * Serializes seek commands while allowing a newer seek intent to supersede a
 * queued one. Native mpv receives only the latest request that reaches the
 * bridge; stale completions are never reported as the active seek result.
 */
export class VideoV3SeekCoordinator {
  private latestRequestId = 0;
  private tail: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly session: VideoV3SessionPort) {}

  request(request: VideoV3SeekRequest): Promise<VideoV3SeekResult> {
    const requestId = ++this.latestRequestId;
    if (this.disposed) {
      return Promise.resolve({status: 'cancelled', requestId});
    }

    const run = this.tail.then(async () => {
      if (this.disposed) return {status: 'cancelled', requestId} as const;
      if (requestId !== this.latestRequestId) {
        return {status: 'superseded', requestId} as const;
      }
      await this.session.seek(request);
      return requestId === this.latestRequestId
        ? ({status: 'applied', requestId} as const)
        : ({status: 'superseded', requestId} as const);
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  cancel(): void {
    this.latestRequestId += 1;
  }

  flush(): Promise<void> {
    return this.tail;
  }

  dispose(): Promise<void> {
    if (this.disposed) return this.tail;
    this.disposed = true;
    this.cancel();
    return this.tail;
  }
}
