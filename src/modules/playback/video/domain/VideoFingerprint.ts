import type {VideoSourceIdentity} from './VideoTypes';

/**
 * Builds a deterministic identity for one video session.
 * Presentation changes must never alter this value.
 */
export function createVideoSourceFingerprint(source: VideoSourceIdentity): string {
  return [
    source.uri,
    source.source,
    source.type,
    source.mediaLane,
    source.provider ?? '',
    source.folderId ?? '',
  ]
    .map(value => encodeURIComponent(value))
    .join('|');
}

export function isSameVideoSource(
  current: string | null,
  next: VideoSourceIdentity,
): boolean {
  return current === createVideoSourceFingerprint(next);
}
