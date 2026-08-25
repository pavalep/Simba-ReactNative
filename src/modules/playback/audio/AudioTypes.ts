import type {ColorTokens} from '../../../../theme/tokens';
import type {TrackMetadata} from '../../../../services/metadataService';
import type {PlaylistEntry} from '../../../../store/slices/playerSlice';
import type {ScannedTrack} from '../../../../store/slices/mediaSlice';
import type {Chapter} from '../../../../components/player/NowPlayingInfo/ChapterList';
import type {LrcLine} from '../../../../utils/lrcParser';

export interface AudioV2ControllerState {
  colors: ColorTokens;
  insets: {top: number; bottom: number; left: number; right: number};
  title: string;
  fileUri: string | null;
  sourceLabel?: string;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  errorIsPermission: boolean;
  isPlaying: boolean;
  isEnded: boolean;
  volume: number;
  metadata: TrackMetadata;
  chapters: Chapter[];
  lyrics: LrcLine[];
  shuffle: boolean;
  loopMode: 'none' | 'file' | 'playlist';
  audioBookmarkCount: number;
  playlist: PlaylistEntry[];
  queue: PlaylistEntry[];
  relatedTracks: ScannedTrack[];
  currentIndex: number;
  resumePrompt: {position: number} | null;
  isBuffering: boolean;
  isSeeking: boolean;
  isSeekable: boolean;
  bufferedRanges: Array<{start: number; end: number}>;
  cacheFill: number;
  onBack: () => void;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRewind: () => void;
  onForward: () => void;
  onSeek: (progress: number) => void;
  onSeekToLyric: (time: number) => void;
  onVolumeChange: (delta: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onOpenBookmark: () => void;
  onBookmark: () => void;
  onOpenQueue: () => void;
  onOpenLyrics: () => void;
  onOpenPlaylist: () => void;
  onOpenInfo: () => void;
  onPlayIndex: (index: number) => void;
  onPlayQueueIndex: (index: number) => void;
  onPlayRelated: (track: ScannedTrack) => void;
  onShare: () => void;
  onMore: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  onResumeChoice: (shouldResume: boolean) => void;
}

export interface AudioV2ViewModel {
  colors: ColorTokens;
  insets: AudioV2ControllerState['insets'];
  title: string;
  artist: string;
  album: string;
  artworkUri: string;
  fileUri: string;
  sourceLabel?: string;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  errorIsPermission: boolean;
  isPlaying: boolean;
  isEnded: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  isBookmarked: boolean;
  queueCount: number;
  queue: PlaylistEntry[];
  lyrics: LrcLine[];
  chapters: Chapter[];
  relatedTracks: ScannedTrack[];
  playlist: PlaylistEntry[];
  currentIndex: number;
  resumePrompt: {position: number} | null;
  isBuffering: boolean;
  isSeeking: boolean;
  isSeekable: boolean;
  bufferedRanges: Array<{start: number; end: number}>;
  cacheFill: number;
  commands: Pick<AudioV2ControllerState, 'onBack' | 'onPlayPause' | 'onPrevious' | 'onNext' | 'onRewind' | 'onForward' | 'onSeek' | 'onSeekToLyric' | 'onVolumeChange' | 'onToggleShuffle' | 'onToggleRepeat' | 'onOpenBookmark' | 'onBookmark' | 'onOpenQueue' | 'onOpenLyrics' | 'onOpenPlaylist' | 'onOpenInfo' | 'onPlayIndex' | 'onPlayQueueIndex' | 'onPlayRelated' | 'onShare' | 'onMore' | 'onDismiss' | 'onRetry' | 'onResumeChoice'>;
}

export const buildAudioV2ViewModel = (
  state: AudioV2ControllerState,
  position: number,
  duration: number,
): AudioV2ViewModel => ({
  colors: state.colors,
  insets: state.insets,
  title: state.title?.trim() || state.fileUri?.split('/').pop() || 'Untitled audio',
  artist: state.metadata.artist?.trim() || 'Unknown artist',
  album: state.metadata.album?.trim() || state.sourceLabel || 'Audio',
  artworkUri: state.metadata.albumArtUri || '',
  fileUri: state.fileUri || '',
  sourceLabel: state.sourceLabel,
  isLoading: state.isLoading,
  isReady: state.isReady,
  error: state.error,
  errorIsPermission: state.errorIsPermission,
  isPlaying: state.isPlaying,
  isEnded: state.isEnded,
  position,
  duration,
  volume: state.volume,
  shuffle: state.shuffle,
  repeatMode: state.loopMode === 'none' ? 'off' : state.loopMode === 'file' ? 'one' : 'all',
  isBookmarked: state.audioBookmarkCount > 0,
  queueCount: state.queue.length,
  lyrics: state.lyrics,
  chapters: state.chapters,
  relatedTracks: state.relatedTracks,
  playlist: state.playlist,
  queue: state.queue,
  currentIndex: state.currentIndex,
  resumePrompt: state.resumePrompt,
  isBuffering: state.isBuffering,
  isSeeking: state.isSeeking,
  isSeekable: state.isSeekable,
  bufferedRanges: state.bufferedRanges,
  cacheFill: state.cacheFill,
  commands: {
    onBack: state.onBack,
    onPlayPause: state.onPlayPause,
    onPrevious: state.onPrevious,
    onNext: state.onNext,
    onRewind: state.onRewind,
    onForward: state.onForward,
    onSeek: state.onSeek,
    onSeekToLyric: state.onSeekToLyric,
    onVolumeChange: state.onVolumeChange,
    onToggleShuffle: state.onToggleShuffle,
    onToggleRepeat: state.onToggleRepeat,
    onOpenBookmark: state.onOpenBookmark,
    onBookmark: state.onBookmark,
    onOpenQueue: state.onOpenQueue,
    onOpenLyrics: state.onOpenLyrics,
    onOpenPlaylist: state.onOpenPlaylist,
    onOpenInfo: state.onOpenInfo,
    onPlayIndex: state.onPlayIndex,
    onPlayQueueIndex: state.onPlayQueueIndex,
    onPlayRelated: state.onPlayRelated,
    onShare: state.onShare,
    onMore: state.onMore,
    onDismiss: state.onDismiss,
    onRetry: state.onRetry,
    onResumeChoice: state.onResumeChoice,
  },
});
