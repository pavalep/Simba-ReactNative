/**
 * Canonical origin of a media item.
 *
 * `source` is intentionally coarse and stable for badges, filtering, and
 * persistence. Provider-specific details belong in `provider`.
 */
export type MediaSource = 'local' | 'api';

/**
 * Product-facing semantic kind used by badges and content-area presentation.
 * `audio` and `video` remain valid broad fallbacks; more specific kinds should
 * be used whenever the originating feature can identify them.
 */
export type MediaKind =
  | 'audio'
  | 'music'
  | 'podcast'
  | 'audiobook'
  | 'radio'
  | 'video'
  | 'movie'
  | 'live-tv'
  | 'archive-audio'
  | 'archive-video';

/** Playback lane used to enforce separate audio and video queues. */
export type MediaLane = 'audio' | 'video';

/** Shared metadata carried by durable media objects and playback payloads. */
export interface MediaClassification {
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  /** Provider or catalog name, for example `jamendo`, `iptv`, or `internet-archive`. */
  provider?: string;
  /** Stable linked-folder identity for local entries. */
  folderId?: string;
}

/** Stable display labels reserved for the future badge system. */
export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  audio: 'Audio',
  music: 'Music',
  podcast: 'Podcast',
  audiobook: 'Audiobook',
  radio: 'Radio',
  video: 'Video',
  movie: 'Movie',
  'live-tv': 'Live TV',
  'archive-audio': 'Archive Audio',
  'archive-video': 'Archive Video',
};

const AUDIO_KINDS: ReadonlySet<MediaKind> = new Set([
  'audio',
  'music',
  'podcast',
  'audiobook',
  'radio',
  'archive-audio',
]);

/** Convert a semantic kind into the queue/player lane. */
export function mediaKindToLane(kind: MediaKind): MediaLane {
  return AUDIO_KINDS.has(kind) ? 'audio' : 'video';
}

/**
 * Normalize a legacy or partially populated record at a state boundary.
 *
 * ## The lane is DERIVED, never stored independently
 *
 * `MediaLane` is not a second piece of truth — it is a pure function of
 * `MediaKind`. This implementation used to do
 * `input.mediaType ?? mediaKindToLane(type)`, which let a persisted lane
 * WIN over the kind it was derived from. That made the normalizer a
 * faithful preserver of a bad value rather than a repair of one: a record
 * persisted as `{type: 'movie', mediaType: 'audio'}` normalised straight
 * back to `mediaType: 'audio'`, forever. Every consumer that trusted the
 * lane then routed a film through the audio pipeline — which is exactly
 * the observed defect (a Turkish film wearing a music badge, and playing
 * through the audio player).
 *
 * Deriving unconditionally means a disagreeing pair self-heals on the next
 * read, and a pair that agrees is unaffected.
 *
 * Note `MediaKind` deliberately includes `'audio'` and `'video'` as broad
 * fallbacks and both are in `AUDIO_KINDS`/not, so `mediaKindToLane` is
 * total over `MediaKind` — including when `input.type` is absent and the
 * type was itself taken from `input.mediaType`.
 */
export function normalizeMediaClassification(input: {
  source?: MediaSource;
  type?: MediaKind;
  mediaType?: MediaLane;
  provider?: string;
  folderId?: string;
}): MediaClassification {
  // `input.type` first, so a real kind is never overwritten by a lane
  // spelling. When it is absent the lane is the only thing we have, and
  // both are valid `MediaKind` values, so this round-trips correctly.
  const type = input.type ?? input.mediaType ?? 'video';

  // The backstop lane is 'video', matching `features/bookmarks`' writer.
  // It used to be 'audio' here while the bookmark path used 'video', so a
  // single omitted field produced two OPPOSITE answers depending on which
  // door a record came through — and both were persisted.
  //
  // Neither value is actually correct for unclassified media, and that is
  // the point. The real fix is one layer up: the launch seam now always
  // writes a lane derived from `bridgeOpts.type`, so this branch is only
  // reachable for a genuinely unclassified legacy row. Consistency
  // matters more than the choice — a single guess is debuggable, two are
  // not.
  const mediaType = mediaKindToLane(type);
  return {
    source: input.source ?? 'local',
    type,
    mediaType,
    ...(input.provider ? {provider: input.provider} : {}),
    ...(input.folderId ? {folderId: input.folderId} : {}),
  };
}

/** Stable identity for a user-linked local folder. */
export interface LinkedMediaFolder {
  /** Stable key derived from the normalized folder path and lane. */
  id: string;
  /** Original filesystem path used by the scanner. */
  path: string;
  /** Which local playback lane this folder contributes to. */
  mediaType: MediaLane;
  source: 'local';
  addedAt: number;
  lastScanAt: number | null;
}

/** Build a deterministic folder identity at the settings/scanner boundary. */
export function linkedMediaFolderId(path: string, mediaType: MediaLane): string {
  return `local-folder:${mediaType}:${path.trim().replace(/\\/g, '/')}`;
}

/** Backward-compatible path-only identity used by folder-browser callers. */
export function linkedMediaFolderIdFromPath(path: string): string {
  return linkedMediaFolderId(path, 'audio');
}

/** Build the canonical classification for a local file scanner result. */
export function classifyLocalMedia(mediaType: MediaLane): MediaClassification {
  return {
    source: 'local',
    type: mediaType,
    mediaType,
  };
}

/** Build an API classification while retaining the provider for future badges. */
export function classifyApiMedia(
  type: MediaKind,
  provider?: string,
): MediaClassification {
  return {
    source: 'api',
    type,
    mediaType: mediaKindToLane(type),
    ...(provider ? {provider} : {}),
  };
}
