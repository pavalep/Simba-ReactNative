/// <reference types="node" />
/**
 * V19 W5 Phase 5.1 + 5.2 — `VideoController` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 *   Phase 5.1: loadFile invalidation, retry() = loadFile(cached),
 *              close() clears state
 *   Phase 5.2: lane integrity, repeat-one / repeat-all / off
 *              finish policy
 *
 * The controller is PURE TypeScript with an injected bridge, so
 * these tests need no renderer and no lib mock — just a spy
 * object. That is the whole point of keeping React out of the
 * policy layer.
 */

import {VideoController} from '../../../../src/infrastructure/player/video/VideoController';
import type {
  VideoControllerDeps,
  VideoItem,
} from '../../../../src/infrastructure/player/video/VideoController';

function makeDeps(overrides: Partial<VideoControllerDeps> = {}): VideoControllerDeps {
  return {
    loadFile: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seek: jest.fn(),
    stop: jest.fn(),
    getNextVideo: jest.fn(() => null),
    ...overrides,
  };
}

const VIDEO_A: VideoItem = {uri: 'a.mp4', title: 'A', lane: 'video'};
const VIDEO_B: VideoItem = {uri: 'b.mp4', title: 'B', lane: 'video'};

// ─── Phase 5.1 — load lifecycle ─────────────────────────────────────

describe('VideoController — 5.1 load lifecycle', () => {
  it("loadFile('a') then loadFile('b') — only b is active", async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    await c.loadFile('a.mp4', {title: 'A'});
    await c.loadFile('b.mp4', {title: 'B'});

    expect(c.getState().currentItem?.uri).toBe('b.mp4');
    expect(c.getState().currentItem?.title).toBe('B');
    // The bridge saw both loads, but the controller's active item
    // is the second one.
    expect(deps.loadFile).toHaveBeenCalledTimes(2);
  });

  it('bump loadToken per load so in-flight work can be invalidated', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    expect(c.getState().loadToken).toBe(0);
    await c.loadFile('a.mp4');
    expect(c.getState().loadToken).toBe(1);
    await c.loadFile('b.mp4');
    expect(c.getState().loadToken).toBe(2);
  });

  it('drops a stale prepare completion when a newer load started', async () => {
    // prepare('a') resolves late; by then loadFile('b') has run.
    let resolveA: () => void = () => {};
    const prepare = jest.fn(
      (_item: VideoItem, token: number) =>
        new Promise<void>(resolve => {
          if (token === 1) resolveA = resolve;
          else resolve();
        }),
    );
    const deps = makeDeps({prepare});
    const c = new VideoController(deps);

    const pA = c.loadFile('a.mp4');
    await c.loadFile('b.mp4'); // token 2 wins
    resolveA();
    await pA; // token 1 completion arrives after

    // The stale token-1 completion must not clobber token-2 state.
    expect(c.getState().currentItem?.uri).toBe('b.mp4');
    expect(c.getState().loadToken).toBe(2);
  });

  it('drops a stale prepare rejection when a newer load started', async () => {
    // token 1's prepare rejects LATE; token 2's resolves normally.
    // Both must settle, otherwise the `await` below hangs.
    let rejectA: (e: unknown) => void = () => {};
    const prepare = jest.fn(
      (_item: VideoItem, token: number) =>
        new Promise<void>((resolve, reject) => {
          if (token === 1) {
            rejectA = reject;
          } else {
            resolve();
          }
        }),
    );
    const deps = makeDeps({prepare});
    const c = new VideoController(deps);

    const pA = c.loadFile('a.mp4');
    await c.loadFile('b.mp4'); // token 2 wins
    rejectA(new Error('ECONNRESET'));
    await pA;

    // The late failure for 'a' must not error the active 'b'.
    expect(c.getState().videoState).not.toBe('error');
    expect(c.getState().currentItem?.uri).toBe('b.mp4');
  });

  it('prepare rejection on the CURRENT load routes to error', async () => {
    const prepare = jest.fn(() => Promise.reject(new Error('HTTP 500 Server Error')));
    const deps = makeDeps({prepare});
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');

    expect(c.getState().videoState).toBe('error');
    expect(c.getState().error?.category).toBe('network');
  });

  it('retry() invokes loadFile(lastUri) with no manual cache from caller', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    await c.loadFile('a.mp4', {title: 'A'});
    (deps.loadFile as jest.Mock).mockClear();

    await c.retry();

    // Same URI, same options, through the same loadFile path.
    expect(deps.loadFile).toHaveBeenCalledWith('a.mp4');
    expect(c.getState().currentItem?.title).toBe('A');
  });

  it('retry() is a no-op when nothing has been loaded', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);
    await c.retry();
    expect(deps.loadFile).not.toHaveBeenCalled();
  });

  it('close() clears currentItem, videoState, error, repeatMode', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    await c.loadFile('a.mp4', {title: 'A'});
    c.setRepeatMode('all');
    c.reportError(new Error('boom'));

    c.close();

    const s = c.getState();
    expect(s.currentItem).toBeNull();
    expect(s.videoState).toBe('idle');
    expect(s.error).toBeNull();
    expect(s.repeatMode).toBe('off');
    // The native session is released.
    expect(deps.stop).toHaveBeenCalled();
  });

  it('close() invalidates in-flight work via loadToken', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);
    await c.loadFile('a.mp4');
    const before = c.getState().loadToken;
    c.close();
    // close() bumps the token, then resets to INITIAL (0) — the
    // important part is that no in-flight token can still match.
    expect(c.getState().loadToken).toBe(0);
    expect(before).toBeGreaterThan(0);
  });
});

// ─── Phase 5.2 — lane integrity ─────────────────────────────────────

describe('VideoController — 5.2 lane integrity', () => {
  it('refuses to load an audio item into the video lane', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    await c.loadFile('song.mp3', {lane: 'audio'});

    // The bridge was never touched — the lane guard is upstream.
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(c.getState().videoState).toBe('error');
    expect(c.getState().currentItem).toBeNull();
  });

  it('derives lane from mediaKind — an audio kind is rejected', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);
    // 'podcast' maps to the audio lane.
    await c.loadFile('ep.mp3', {kind: 'podcast'});
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(c.getState().videoState).toBe('error');
  });

  it('accepts a video kind', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);
    await c.loadFile('clip.mp4', {kind: 'movie'});
    expect(deps.loadFile).toHaveBeenCalledWith('clip.mp4');
    expect(c.getState().currentItem?.lane).toBe('video');
  });

  it('next() returns a video item or "no next" — never audio', async () => {
    // The resolver is lane-scoped by construction; the controller
    // consumes whatever it returns. This test pins that the
    // controller never itself reaches for an audio item.
    const deps = makeDeps({getNextVideo: jest.fn(() => VIDEO_B)});
    const c = new VideoController(deps);
    await c.loadFile('a.mp4');
    c.setRepeatMode('all');
    c.handleEof();
    expect(c.getState().currentItem?.uri).toBe('b.mp4');
    expect(c.getState().currentItem?.lane).toBe('video');
  });
});

// ─── Phase 5.2 — finish policy ──────────────────────────────────────

describe('VideoController — 5.2 finish policy', () => {
  it("repeat-one on EOF restarts the same item, no second loadFile", async () => {
    const deps = makeDeps({getNextVideo: jest.fn(() => VIDEO_B)});
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');
    c.setRepeatMode('one');
    (deps.loadFile as jest.Mock).mockClear();

    c.handleEof();

    // Same item restarts via seek(0) + play — NOT a reload.
    expect(deps.seek).toHaveBeenCalledWith(0);
    expect(deps.play).toHaveBeenCalled();
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(c.getState().currentItem?.uri).toBe('a.mp4');
    expect(c.getState().videoState).toBe('playing');
  });

  it('repeat-all on EOF loads the next video', async () => {
    const deps = makeDeps({getNextVideo: jest.fn(() => VIDEO_B)});
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');
    c.setRepeatMode('all');
    c.handleEof();
    // handleEof triggers an async loadFile; let it settle.
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.loadFile).toHaveBeenCalledWith('b.mp4');
    expect(c.getState().currentItem?.uri).toBe('b.mp4');
  });

  it('repeat-all with nextItem === null sets finished (no auto-replay)', async () => {
    const deps = makeDeps({getNextVideo: jest.fn(() => null)});
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');
    c.setRepeatMode('all');
    (deps.loadFile as jest.Mock).mockClear();

    c.handleEof();

    expect(c.getState().videoState).toBe('finished');
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(deps.play).not.toHaveBeenCalled();
  });

  it("off on EOF sets finished — no auto-replay, stays on the item", async () => {
    const deps = makeDeps({getNextVideo: jest.fn(() => VIDEO_B)});
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');
    c.setRepeatMode('off');
    (deps.loadFile as jest.Mock).mockClear();

    c.handleEof();

    expect(c.getState().videoState).toBe('finished');
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(deps.seek).not.toHaveBeenCalled();
    expect(c.getState().currentItem?.uri).toBe('a.mp4');
  });

  it('play-after-finished is reset-to-zero + resume, NOT a reload', async () => {
    const deps = makeDeps();
    const c = new VideoController(deps);

    await c.loadFile('a.mp4');
    c.setRepeatMode('off');
    c.handleEof();
    expect(c.getState().videoState).toBe('finished');
    (deps.loadFile as jest.Mock).mockClear();

    c.play();

    expect(deps.seek).toHaveBeenCalledWith(0);
    expect(deps.play).toHaveBeenCalled();
    expect(deps.loadFile).not.toHaveBeenCalled();
    expect(c.getState().videoState).toBe('playing');
  });
});

// ─── Phase 5.3 — error surface ──────────────────────────────────────

describe('VideoController — 5.3 error classification', () => {
  it('reportError routes through the classifier', () => {
    const c = new VideoController(makeDeps());
    c.reportError(new Error('HTTP 503 Service Unavailable'));
    expect(c.getState().videoState).toBe('error');
    expect(c.getState().error?.category).toBe('network');
    expect(c.getState().error?.actions).toContain('retry');
  });

  it('requestRecovery emits a recovery intent without mutating UI', () => {
    const deps = makeDeps();
    const c = new VideoController(deps);
    const events: string[] = [];
    c.subscribe(e => events.push(e.type));

    c.reportError(new Error('another player is active'));
    c.requestRecovery('stop-other');

    expect(events).toContain('recovery');
    // The controller does not act on recovery — the view does.
    expect(deps.stop).not.toHaveBeenCalled();
  });

  it('a successful load clears a prior error', async () => {
    const c = new VideoController(makeDeps());
    c.reportError(new Error('boom'));
    expect(c.getState().error).not.toBeNull();
    await c.loadFile('a.mp4');
    expect(c.getState().error).toBeNull();
  });
});

// ─── Observation intake ─────────────────────────────────────────────

describe('VideoController — observation intake', () => {
  it('observePlayback updates the phase', async () => {
    const c = new VideoController(makeDeps());
    await c.loadFile('a.mp4');
    expect(c.getState().videoState).toBe('loading');

    // The view reports the real lib state it observed.
    c.observePlayback('ready');
    expect(c.getState().videoState).toBe('ready');
    c.observePlayback('playing');
    expect(c.getState().videoState).toBe('playing');
  });

  it('ignores observation when no item is loaded', () => {
    const c = new VideoController(makeDeps());
    c.observePlayback('playing');
    expect(c.getState().videoState).toBe('idle');
  });

  it('error is sticky — a late "ready" does not clear it', async () => {
    const c = new VideoController(makeDeps());
    await c.loadFile('a.mp4');
    c.reportError(new Error('boom'));
    expect(c.getState().videoState).toBe('error');

    c.observePlayback('ready');
    expect(c.getState().videoState).toBe('error');
  });

  it('ignores observation after close()', async () => {
    const c = new VideoController(makeDeps());
    await c.loadFile('a.mp4');
    c.close();
    c.observePlayback('playing');
    expect(c.getState().videoState).toBe('idle');
  });
});
