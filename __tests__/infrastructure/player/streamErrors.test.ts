/**
 * V21 W7 P28 — `StreamError` variants + `Result` + `capture` + `map`
 * unit tests. Pure type-level + value-level tests; no React, no
 * module mocks.
 *
 * The bridge mapping (`openPlayer()` → `Result<PlaybackId,
 * StreamError>`) is tested in `usePlay.test.tsx` since it requires
 * mocking `usePlayerActivity`.
 */

import {
  blockedError,
  capture,
  err,
  expiredError,
  isBlockedError,
  isExpiredError,
  isNetworkError,
  isUnsupportedError,
  map,
  networkError,
  ok,
  unsupportedError,
  type Result,
  type StreamError,
} from '../../../src/infrastructure/player/streamErrors';

describe('StreamError variants (V21 W7 P28)', () => {
  describe('networkError', () => {
    it('has the network kind and a default message', () => {
      const e = networkError();
      expect(e.kind).toBe('network');
      expect(e.message).toBe('Network unavailable');
      expect(e.retryable).toBe(true);
    });
    it('respects overrides', () => {
      const e = networkError('Custom message', {cause: 'ECONNRESET', retryable: false});
      expect(e.message).toBe('Custom message');
      expect(e.cause).toBe('ECONNRESET');
      expect(e.retryable).toBe(false);
    });
  });

  describe('unsupportedError', () => {
    it('has the unsupported kind and a default message', () => {
      const e = unsupportedError();
      expect(e.kind).toBe('unsupported');
      expect(e.message).toBe('Media format not supported');
      expect(e.drm).toBe(false);
    });
    it('respects overrides', () => {
      const e = unsupportedError('Codec mismatch', {format: 'video/x-matroska', drm: true});
      expect(e.message).toBe('Codec mismatch');
      expect(e.format).toBe('video/x-matroska');
      expect(e.drm).toBe(true);
    });
  });

  describe('expiredError', () => {
    it('has the expired kind and a default message', () => {
      const e = expiredError();
      expect(e.kind).toBe('expired');
      expect(e.message).toBe('Authentication expired — please sign in again');
      expect(e.reAuthAvailable).toBe(true);
    });
    it('respects overrides', () => {
      const e = expiredError('Sign in again', {provider: 'podcastIndex', reAuthAvailable: false});
      expect(e.message).toBe('Sign in again');
      expect(e.provider).toBe('podcastIndex');
      expect(e.reAuthAvailable).toBe(false);
    });
  });

  describe('blockedError', () => {
    it('has the blocked kind and a default reason', () => {
      const e = blockedError();
      expect(e.kind).toBe('blocked');
      expect(e.message).toBe('Content blocked');
      expect(e.reason).toBe('unknown');
    });
    it('respects overrides', () => {
      const e = blockedError('Not available in your region', {provider: 'archive.org', reason: 'geo'});
      expect(e.message).toBe('Not available in your region');
      expect(e.provider).toBe('archive.org');
      expect(e.reason).toBe('geo');
    });
  });
});

describe('StreamError type guards (V21 W7 P28)', () => {
  it('isNetworkError narrows only to NetworkStreamError', () => {
    const variants: StreamError[] = [
      networkError(),
      unsupportedError(),
      expiredError(),
      blockedError(),
    ];
    const only = variants.filter(isNetworkError);
    expect(only).toHaveLength(1);
    expect(only[0].kind).toBe('network');
  });
  it('isUnsupportedError narrows only to UnsupportedStreamError', () => {
    const variants: StreamError[] = [
      networkError(),
      unsupportedError(),
      expiredError(),
      blockedError(),
    ];
    const only = variants.filter(isUnsupportedError);
    expect(only).toHaveLength(1);
    expect(only[0].kind).toBe('unsupported');
  });
  it('isExpiredError narrows only to ExpiredStreamError', () => {
    const variants: StreamError[] = [
      networkError(),
      unsupportedError(),
      expiredError(),
      blockedError(),
    ];
    const only = variants.filter(isExpiredError);
    expect(only).toHaveLength(1);
    expect(only[0].kind).toBe('expired');
  });
  it('isBlockedError narrows only to BlockedStreamError', () => {
    const variants: StreamError[] = [
      networkError(),
      unsupportedError(),
      expiredError(),
      blockedError(),
    ];
    const only = variants.filter(isBlockedError);
    expect(only).toHaveLength(1);
    expect(only[0].kind).toBe('blocked');
  });
});

describe('Result<T, E> (V21 W7 P28)', () => {
  it('ok() wraps a value', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });
  it('err() wraps an error', () => {
    const r = err('oops');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('oops');
  });
  it('map() transforms the success value', () => {
    const r1 = ok(2);
    const r2 = map(r1, x => x * 10);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.value).toBe(20);
  });
  it('map() passes through errors untouched', () => {
    const r1: Result<number, string> = err('failed');
    const r2: Result<string, string> = map(r1, x => `x=${x}`);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('failed');
  });
  it('map() on a typed Result preserves the error type', () => {
    const r1: Result<number, StreamError> = err(networkError('boom'));
    const r2: Result<string, StreamError> = map(r1, x => `x=${x}`);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(isNetworkError(r2.error)).toBe(true);
  });
});

describe('capture() (V21 W7 P28)', () => {
  it('wraps a synchronous return value in ok()', async () => {
    const r = await capture(() => 42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });
  it('wraps a synchronous throw in err(networkError)', async () => {
    const r = await capture(() => {
      throw new Error('boom');
    });
    expect(r.ok).toBe(false);
    if (!r.ok && isNetworkError(r.error)) {
      expect(r.error.cause).toBe('boom');
    } else {
      fail(`expected network error, got: ${JSON.stringify(r)}`);
    }
  });
  it('wraps a rejected promise in err(networkError)', async () => {
    const r = await capture(async () => {
      throw new Error('async boom');
    });
    expect(r.ok).toBe(false);
    if (!r.ok && isNetworkError(r.error)) {
      expect(r.error.cause).toBe('async boom');
    } else {
      fail(`expected network error, got: ${JSON.stringify(r)}`);
    }
  });
  it('handles a non-Error throwable', async () => {
    const r = await capture(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'string thrown';
    });
    expect(r.ok).toBe(false);
    if (!r.ok && isNetworkError(r.error)) {
      expect(r.error.cause).toBe('string thrown');
    } else {
      fail(`expected network error, got: ${JSON.stringify(r)}`);
    }
  });
  it('respects a custom mapThrowable', async () => {
    const r = await capture<number, StreamError>(
      () => {
        throw new Error('blocked by user-agent');
      },
      () => blockedError('Blocked by user-agent', {reason: 'geo'}),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('blocked');
      if (r.error.kind === 'blocked') {
        expect(r.error.reason).toBe('geo');
      }
    }
  });
  it('wraps a non-async (sync) return in ok()', async () => {
    const r = await capture(() => 'hello');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('hello');
  });
});

describe('Result + StreamError integration (V21 W7 P28)', () => {
  it('a full play() flow: ok → map → err', async () => {
    const r1: Result<number, StreamError> = ok(10);
    const r2 = map(r1, x => `played ${x}s`);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.value).toBe('played 10s');

    const r3: Result<number, StreamError> = err(networkError('offline'));
    const r4 = map(r3, x => `played ${x}s`);
    expect(r4.ok).toBe(false);
    if (!r4.ok && isNetworkError(r4.error)) {
      expect(r4.error.message).toBe('offline');
    }
  });
});
