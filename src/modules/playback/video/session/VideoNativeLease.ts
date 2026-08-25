let currentLease: symbol | null = null;

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
