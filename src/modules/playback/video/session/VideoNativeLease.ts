let currentLease: symbol | null = null;
// L2: when a session is being torn down, its release microtask chain
// (stop → destroy → release the lease) runs asynchronously. If a new
// mount creates a new session immediately after the old one starts
// releasing, the new session's `initPlayer()` can race the old
// session's `destroy()` — the native handle gets destroyed under the
// new session. We track the pending-release promise here so the
// new session can `await` it before acquiring the lease.
let pendingRelease: Promise<void> = Promise.resolve();

export type VideoNativeLease = symbol;

export function acquireVideoNativeLease(): VideoNativeLease {
  const lease = Symbol('video-native-session');
  currentLease = lease;
  return lease;
}

export function ownsVideoNativeLease(lease: VideoNativeLease): boolean {
  return currentLease === lease;
}

export function releaseVideoNativeLease(lease: VideoNativeLease): void {
  if (currentLease === lease) {
    currentLease = null;
  }
}

/** L2: register an in-flight teardown so the next acquisition can
 *  wait for it. Returns the chained promise. The host calls this
 *  immediately after `createVideoPlayback()` returns so a subsequent
 *  acquisition on a future mount can await the cleanup before
 *  trying to `initPlayer()` again. */
export function chainVideoNativeRelease(releasePromise: Promise<void>): Promise<void> {
  pendingRelease = pendingRelease.then(() => releasePromise, () => releasePromise);
  return releasePromise;
}

/** L2: return the current pending-release promise. Callers can `await`
 *  this to wait for the previous teardown to finish. */
export function waitForVideoNativeRelease(): Promise<void> {
  return pendingRelease;
}
