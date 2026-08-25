import type {VideoLoadRequest, VideoSessionPort} from './VideoSessionPort';

export type VideoIntent =
  | {type: 'load'; request: VideoLoadRequest}
  | {type: 'refresh'}
  | {type: 'play'}
  | {type: 'pause'}
  | {type: 'seek'; position: number; generation: number}
  | {type: 'set-volume'; volume: number}
  | {type: 'set-muted'; muted: boolean}
  | {type: 'set-speed'; speed: number}
  | {type: 'select-track'; trackId: number}
  | {type: 'set-caption-visibility'; visible: boolean}
  | {type: 'release'};

export type VideoCommandResult =
  | {ok: true; generation?: number}
  | {ok: false; message: string};

export interface VideoIntentDispatcher {
  dispatch(intent: VideoIntent): Promise<VideoCommandResult>;
  dispose(): Promise<void>;
}

export type VideoSessionFactory = () => VideoSessionPort;
