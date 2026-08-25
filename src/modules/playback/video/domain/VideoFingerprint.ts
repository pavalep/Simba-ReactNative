import type {VideoV3SourceIdentity} from './VideoV3Types';

/**
 * Builds a deterministic identity for one video session.
 * Presentation changes must never alter this value.
 */
export function createVideoV3SourceFingerprint(source: VideoV3SourceIdentity): string {
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

export function isSameVideoV3Source(
  current: string | null,
  next: VideoV3SourceIdentity,
): boolean {
  return current === createVideoV3SourceFingerprint(next);
}
