import type {VideoV3LoadRequest, VideoV3SessionPort} from './VideoV3SessionPort';

export type VideoV3Intent =
  | {type: 'load'; request: VideoV3LoadRequest}
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

export type VideoV3CommandResult =
  | {ok: true; generation?: number}
  | {ok: false; message: string};

export interface VideoV3IntentDispatcher {
  dispatch(intent: VideoV3Intent): Promise<VideoV3CommandResult>;
  dispose(): Promise<void>;
}

export type VideoV3SessionFactory = () => VideoV3SessionPort;
