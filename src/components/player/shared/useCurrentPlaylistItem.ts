/**
 * WAVE B15 — "the item that is playing", as a PLAYLIST item.
 *
 * ## Why this exists
 *
 * Both lanes' more sheets offer "Add to playlist". That action needs a
 * playlist item: a URI, a title, a duration, and the classification
 * (source / kind / lane / provider) the playlist store filters on.
 *
 * Deriving that per lane would be two answers to one question, and the
 * classification is exactly where two answers go wrong: the playlist
 * store refuses an item a single-lane playlist may not hold
 * (`isPlaylistMediaKindAllowed`), so a wrong LANE silently refuses the
 * add and a wrong KIND puts the wrong badge on it.
 *
 * So the derivation lives here, once, and both lanes read it.
 *
 * ## Where each field comes from
 *
 *   - the URI and the catalogue facts come from the SESSION
 *     (`useNowPlayingStore`) — the launch seam recorded them, and the
 *     session is the owner of "what is playing";
 *   - the duration comes from the TRANSPORT, because the session does not
 *     carry one, and it is converted from milliseconds to SECONDS here,
 *     at the boundary, because that is the unit the playlist and the queue
 *     both use (`PlaylistItem.duration`; the Queue screen formats it with
 *     `formatDuration`, which reads seconds);
 *   - the SOURCE comes from the URI's scheme (`isRemoteUri`) — the app's
 *     one owner for "is this a remote file or one on the device". The
 *     session does not carry a source, and a provider's presence is not
 *     the same fact (an API item can have no provider, and a local file
 *     never has one).
 *
 * Architecture source of truth: `src/types/media.ts`
 * (`normalizeMediaClassification`), `src/utils/mediaUri.ts`.
 */

import {useMemo} from 'react';
import {useTransport} from '../../../infrastructure/player/useTransport';
import {useNowPlayingStore} from '../../../state/nowPlayingStore';
import {isRemoteUri} from '../../../utils/mediaUri';
import {mediaKindToLane, type MediaKind, type MediaLane, type MediaSource} from '../../../types/media';

/** The shape the playlist picker takes. */
export interface CurrentPlaylistItem {
  fileUri: string;
  title: string;
  /** SECONDS — the playlist's unit. */
  duration: number;
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  thumbnailPath?: string;
}

/**
 * The playing item as a playlist item, or null when nothing is playing.
 */
export function useCurrentPlaylistItem(): CurrentPlaylistItem | null {
  const {state} = useTransport();
  const session = useNowPlayingStore(s => s.current);

  return useMemo(() => {
    if (!session) return null;

    const uri = session.uri;
    const mediaType: MediaLane =
      session.mediaLane ??
      (session.streamType === 'audio' ? 'audio' : 'video');
    const type: MediaKind = session.type ?? mediaKindToLane(mediaType);

    return {
      fileUri: uri,
      title: session.title || state.title || 'Untitled',
      // Milliseconds in, SECONDS out — converted once, here.
      duration: Math.max(0, Math.round(state.durationMs / 1000)),
      source: isRemoteUri(uri) ? 'api' : 'local',
      type,
      mediaType,
      ...(session.provider ? {provider: session.provider} : {}),
      ...(session.thumbnailPath ? {thumbnailPath: session.thumbnailPath} : {}),
    };
  }, [session, state.title, state.durationMs]);
}
