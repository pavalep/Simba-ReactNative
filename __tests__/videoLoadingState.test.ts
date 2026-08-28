/**
 * v11 T1.1 unit tests for the discriminated loadingState union.
 *
 * Three canonical sequences the tracker requires (step 6 of T1.1):
 *   1. load → preparing → idle
 *   2. transport reset → reconnecting (placeholder: surfaces as
 *      `error` because no rule currently produces `reconnecting`)
 *   3. error event → error
 *
 * Plus the stale-generation guard and the seeking-wins-over-buffering
 * precedence.
 */
import {emptyVideoSnapshot} from '../src/modules/playback/video/domain/VideoTypes';
import {deriveLoadingState} from '../src/modules/playback/video/domain/deriveLoadingState';
import {reduceVideoSessionEvent} from '../src/modules/playback/video/state/reduceVideoSessionEvent';
import type {VideoSessionSnapshot} from '../src/modules/playback/video/domain/VideoTypes';

const GEN = 1;

function withGen(s: VideoSessionSnapshot): VideoSessionSnapshot {
  return {...s, generation: GEN};
}

function startWithSource(): VideoSessionSnapshot {
  return withGen({
    ...emptyVideoSnapshot(),
    source: {
      uri: 'x',
      title: 't',
      source: 'local',
      type: 'video',
      mediaLane: 'video',
    },
  });
}

describe('VideoLoadingState — T1.1 derivation', () => {
  test('deriveLoadingState: empty snapshot is idle', () => {
    const s = emptyVideoSnapshot();
    expect(deriveLoadingState(s)).toEqual({kind: 'idle'});
    expect(s.isLoading).toBe(false);
  });

  test('Sequence 1 — load → preparing → first-frame → idle', () => {
    let s = startWithSource();
    s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
    expect(s.loadingState).toEqual({kind: 'preparing'});
    expect(s.isLoading).toBe(true);

    s = reduceVideoSessionEvent(s, {
      type: 'playback-state-changed',
      generation: GEN,
      isPlaying: true,
    });
    s = reduceVideoSessionEvent(s, {type: 'first-frame', generation: GEN});
    expect(s.loadingState).toEqual({kind: 'idle'});
    expect(s.isLoading).toBe(false);
  });

  test('Sequence 2 — stall → buffering → recovery → idle', () => {
    let s = startWithSource();
    s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
    s = reduceVideoSessionEvent(s, {
      type: 'playback-state-changed',
      generation: GEN,
      isPlaying: true,
    });
    s = reduceVideoSessionEvent(s, {type: 'first-frame', generation: GEN});
    expect(s.loadingState.kind).toBe('idle');

    s = reduceVideoSessionEvent(s, {
      type: 'buffering-changed',
      generation: GEN,
      isBuffering: true,
      cacheFill: 0.62,
    });
    expect(s.loadingState).toEqual({kind: 'buffering', cacheFill: 0.62});
    expect(s.isLoading).toBe(true);

    s = reduceVideoSessionEvent(s, {
      type: 'playback-restart',
      generation: GEN,
    });
    expect(s.loadingState).toEqual({kind: 'idle'});
    expect(s.isLoading).toBe(false);
  });

  test('Sequence 3 — error event → error', () => {
    let s = startWithSource();
    s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
    s = reduceVideoSessionEvent(s, {
      type: 'error',
      generation: GEN,
      message: 'no first frame',
      recoverable: true,
    });
    expect(s.loadingState).toEqual({
      kind: 'error',
      message: 'no first frame',
      recoverable: true,
    });
    expect(s.isLoading).toBe(true);
  });

  test('Seeking wins over buffering (precedence rule §3.1)', () => {
    const s: VideoSessionSnapshot = {
      ...startWithSource(),
      isBuffering: true,
      cacheFill: 0.4,
      isSeeking: true,
    };
    expect(deriveLoadingState(s)).toEqual({kind: 'seeking', to: 0});
  });

  test('Error wins over seeking (terminal state)', () => {
    const s: VideoSessionSnapshot = {
      ...startWithSource(),
      isSeeking: true,
      isBuffering: true,
      error: {message: 'fatal', recoverable: false, generation: GEN},
    };
    expect(deriveLoadingState(s)).toEqual({
      kind: 'error',
      message: 'fatal',
      recoverable: false,
    });
  });

  test('Stale-generation playback-restart cannot clear a current stall', () => {
    let s = startWithSource();
    s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
    s = reduceVideoSessionEvent(s, {
      type: 'playback-state-changed',
      generation: GEN,
      isPlaying: true,
    });
    s = reduceVideoSessionEvent(s, {type: 'first-frame', generation: GEN});
    s = reduceVideoSessionEvent(s, {
      type: 'buffering-changed',
      generation: GEN,
      isBuffering: true,
      cacheFill: 0.4,
    });
    const before = s;
    // Stale event from a previous generation must be a no-op.
    const after = reduceVideoSessionEvent(s, {
      type: 'playback-restart',
      generation: 99,
    });
    expect(after).toBe(before);
    expect(after.loadingState).toEqual({kind: 'buffering', cacheFill: 0.4});
  });

  test('onPlaybackRestart is a no-op when not buffering (existing B1 guard)', () => {
    let s = startWithSource();
    s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
    s = reduceVideoSessionEvent(s, {
      type: 'playback-state-changed',
      generation: GEN,
      isPlaying: true,
    });
    s = reduceVideoSessionEvent(s, {type: 'first-frame', generation: GEN});
    const before = s;
    const after = reduceVideoSessionEvent(s, {
      type: 'playback-restart',
      generation: GEN,
    });
    expect(after).toBe(before);
    expect(after.loadingState).toEqual({kind: 'idle'});
  });
});
