// ─── Music — the Jamendo queue item ───────────────────────────────────
// The ONE classification the app gives a Jamendo track, expressed as
// a queueable item.
//
// The Jamendo adapter does NOT classify a track: it maps the wire
// record to `{id, name, artistName, albumName, duration, audioUrl,
// imageUrl}` and nothing else, so `source` / `type` / `mediaType` /
// `provider` are all unset on the track itself. Whoever queues the
// track owns that classification.
//
// This is the same item `StreamingRow` builds for the "More From This
// Artist" rows (`src/components/media/StreamingRow/StreamingRow.tsx`)
// — a Jamendo track is an API-sourced MUSIC track on the AUDIO lane —
// written out here so the Music screen's row menu and the rest of the
// app cannot disagree about what a Jamendo track is.

import type {QueueableItem} from '../../../types/media';
import type {JamendoTrackResult} from '../../../types/api';

/** The queueable form of a Jamendo track. */
export function jamendoQueueItem(track: JamendoTrackResult): QueueableItem {
  return {
    uri: track.audioUrl,
    title: track.name,
    duration: track.duration,
    source: 'api',
    type: 'music',
    mediaType: 'audio',
    provider: 'jamendo',
  };
}
