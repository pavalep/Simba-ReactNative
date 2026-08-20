import type {
  MediaClassification,
  MediaKind,
  MediaLane,
  MediaSource,
} from './media';
import {normalizeMediaClassification} from './media';

/**
 * Route context retained when a media item enters playback. Keeping this
 * context with the entry prevents resume/bookmark writes from losing the
 * originating detail or browse surface.
 */
export interface PlaybackOrigin {
  route: string;
  params?: Record<string, unknown>;
}

/**
 * Canonical runtime playback record shared by audio and video players.
 * `mediaType` is the queue/player lane; `type` remains the product-facing
 * semantic kind used by badges and content-area presentation.
 */
export interface PlaybackEntry extends MediaClassification {
  uri: string;
  title: string;
  duration: number;
  artist?: string;
  album?: string;
  artworkUri?: string;
  resumePosition?: number;
  origin?: PlaybackOrigin;
  autoplay?: boolean;
}

/** Input accepted at construction boundaries, including legacy partial data. */
export type PlaybackEntryInput = Omit<
  PlaybackEntry,
  'source' | 'type' | 'mediaType'
> &
  Partial<Pick<PlaybackEntry, 'source' | 'type' | 'mediaType' | 'provider' | 'folderId'>>;

/** Normalize legacy or partially populated playback payloads once at entry. */
export function normalizePlaybackEntry(input: PlaybackEntryInput): PlaybackEntry {
  return {
    ...input,
    ...normalizeMediaClassification(input),
  };
}

export type {MediaClassification, MediaKind, MediaLane, MediaSource};
