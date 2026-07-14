/**
 * `@simba/native` — Simba Player Native Module Interface
 *
 * This module defines the contract between React Native and the native
 * mpv player layer. It supports two bridging strategies:
 *
 * 1. **Turbo Module** (New Architecture) — preferred, type-safe, synchronous
 * 2. **Legacy Native Module** (Old Architecture) — fallback via NativeModules
 *
 * ## Usage
 * ```ts
 * import {MpvPlayer} from '../native';
 *
 * MpvPlayer.initPlayer();
 * MpvPlayer.loadFile('/path/to/video.mp4');
 * MpvPlayer.play();
 *
 * const unsub = MpvPlayer.on('onPositionChanged', ({position}) => {
 *   console.log(position);
 * });
 * ```
 *
 * ## Future SDK Packaging
 * When extracted to a standalone SDK, consumers will import from `@simba/player-sdk`:
 * ```ts
 * import {MpvPlayer, MpvPlayerView} from '@simba/player-sdk';
 * ```
 * The type contract remains identical — swap only the import path.
 */

export {default as MpvPlayer, default} from './player.api';

export type {Spec as MpvPlayerNativeSpec} from './NativeMpvPlayer';

export type {
  MpvFileInfo,
  MpvTrack,
  MpvChapter,
  MpvPlaybackState,
  MpvLoopMode,
  MpvAudioDevice,
  MpvVideoParams,
  MpvPropertyChange,
  MpvEvents,
  MpvEventName,
} from './NativeMpvPlayer';
