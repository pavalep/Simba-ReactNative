import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import type {PlaybackEntry, PlaybackEntryInput} from '../../types/playback';

type PlaybackLane = 'audio' | 'video';

export interface PlaybackChapterParam {
  uri: string;
  title: string;
  duration?: number;
}

export interface PlaybackChannelParam {
  id: string;
  name: string;
  url: string;
  logo?: string;
}

export interface AudioPlaybackParams {
  fileUri?: string;
  fileTitle?: string;
  artworkUri?: string;
  source?: MediaSource;
  type?: MediaKind;
  mediaType?: MediaLane;
  provider?: string;
  folderId?: string;
  startPosition?: number;
  chapterList?: PlaybackChapterParam[];
  chapterIndex?: number;
}

export interface VideoPlaybackParams {
  fileUri?: string;
  fileTitle?: string;
  startPosition?: number;
  source?: MediaSource;
  type?: MediaKind;
  mediaType?: MediaLane;
  provider?: string;
  folderId?: string;
  liveChannels?: PlaybackChannelParam[];
  liveChannelIndex?: number;
  initialError?: {title: string; message: string};
}

export interface PlaybackNavigation {
  canGoBack: () => boolean;
  goBack: () => void;
  replaceVideo?: (params: VideoPlaybackParams) => void;
  navigateHome?: () => void;
}


export interface PlaybackOpenRequest extends PlaybackEntryInput {
  /** Explicit player lane for callers whose media classification is incomplete. */
  mediaLane?: PlaybackLane;
  /** Explicit resume position requested by the caller. */
  startPosition?: number;
  /** W5.6: subtitle language to enable on load (matches the
   *  `language` field of a `VideoTrack` on the loaded session).
   *  The player matches by language because the Internet Archive
   *  subtitle shape doesn't expose stable ids. When the caller
   *  omits this, the player keeps its default behaviour (no
   *  auto-select). */
  subtitleLanguage?: string;
  /** Audio-book or chapter sequence metadata. */
  chapterList?: PlaybackChapterParam[];
  chapterIndex?: number;
  /** Live-TV channel sequence metadata. */
  liveChannels?: PlaybackChannelParam[];
  liveChannelIndex?: number;
  initialError?: {title: string; message: string};
}

export type PlaybackPresentation = 'none' | 'mini' | 'expanded';

export interface ActivePlayback {
  entry: PlaybackEntry;
  presentation: Exclude<PlaybackPresentation, 'none'>;
  /** Monotonic identity for a new openPlayer intent; unchanged by collapse/expand. */
  openRequestId?: number;
  startPosition?: number;
  /** W5.6: subtitle language to enable on load. Forwarded to the
   *  session's track selection after the first `onTracksChanged`
   *  event lands. Undefined leaves the player's default behaviour
   *  (no auto-select). */
  subtitleLanguage?: string;
  chapterList?: PlaybackChapterParam[];
  chapterIndex?: number;
  liveChannels?: PlaybackChannelParam[];
  liveChannelIndex?: number;
  initialError?: {title: string; message: string};
}

export interface PlaybackState {
  active: ActivePlayback | null;
  /**
   * V12 Phase 8: `true` while a dedicated `PlayerActivity` has been
   * launched and is on screen. Set by `PlaybackProvider.openPlayer`
   * when `USE_DEDICATED_PLAYER_ACTIVITY` is on and the bridge
   * `MpvPlayer.openPlayer(...)` is invoked; cleared by
   * `closePlayer()` (which runs on the activity teardown path).
   *
   * Hosts read this to decide whether to make their presentation
   * shell transparent (so the SurfaceView at the activity content
   * root shows through) or opaque (the v11 hotfix behaviour used by
   * the inline MainActivity mini-player).
   */
  inPlayerActivity: boolean;
  /**
   * V12 Phase 13: explicit playback type for the current launch
   * (`'video'` or `'audio'`). Set to the type the most recent
   * `openPlayer` delegation carried, in BOTH MainActivity and
   * PlayerActivity contexts. `null` when no `openPlayer` has fired
   * yet. Hosts (PlaybackOverlayHost) read this together with
   * `active.entry.mediaType` to pick the right renderer
   * (`VideoHost` for video, `AudioModule` for audio).
   *
   * Note: in practice this is redundant with
   * `getPlaybackLane(active)` for the V11 inline path. It earns
   * its keep in the V12 PlayerActivity path where `active` is
   * rebuilt from the bridge after the launched activity's JS
   * context initialises — having the type in PlaybackState from
   * the very first render lets a host render an audio-only
   * placeholder before the bridge round-trip completes.
   */
  currentPlaybackType: 'video' | 'audio' | null;
}

export interface PlaybackCommands {
  openPlayer: (request: PlaybackOpenRequest) => void;
  expandPlayer: () => void;
  collapsePlayer: () => void;
  closePlayer: () => void;
  /**
   * V12 Phase 13: rebuild PlaybackContext state from the bridge
   * launch params (one-shot, idempotent). Returns true if launch
   * params were applied (we're in PlayerActivity), false otherwise
   * (we're in MainActivity). Called from `App.tsx`'s mount effect.
   */
  loadLaunchParams: () => boolean;
}

export type PlaybackContextValue = PlaybackState & PlaybackCommands;

export function toPlaybackEntryInput(request: PlaybackOpenRequest): PlaybackEntryInput {
  const {mediaLane: _mediaLane, startPosition: _startPosition, chapterList: _chapterList, chapterIndex: _chapterIndex, liveChannels: _liveChannels, liveChannelIndex: _liveChannelIndex, initialError: _initialError, ...entry} = request;
  return entry;
}

export function getPlaybackLane(active: ActivePlayback): PlaybackLane {
  return active.entry.mediaType === 'video' ? 'video' : 'audio';
}
