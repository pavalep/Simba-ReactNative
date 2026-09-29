/// <reference types="node" />
/**
 * V19 W5 Phase 5.3 — `classifyError()` table test + fuzz test.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.3
 *   - "Unit test: classifier table — every documented input →
 *     expected output, plus a fuzz test for the 'anything else'
 *     fallback"
 *
 * The classifier is PURE (no React, no lib, no clock), so these
 * tests need no renderer and no mocks — the highest-confidence
 * tests in the V19 suite for that reason.
 */

import {classifyError} from '../../../../src/infrastructure/player/video/errorClassifier';
import type {ErrorCategory} from '../../../../src/infrastructure/player/video/errorClassifier';

describe('classifyError — documented table', () => {
  it('network: HTTP 5xx → "Couldn\'t reach the server"', () => {
    const r = classifyError(new Error('HTTP 503 Service Unavailable'));
    expect(r.category).toBe('network');
    expect(r.title).toBe("Couldn't reach the server");
    expect(r.actions).toContain('retry');
    expect(r.retryable).toBe(true);
  });

  it('network: DNS failure', () => {
    expect(classifyError(new Error('getaddrinfo ENOTFOUND cdn.example.com')).category).toBe(
      'network',
    );
  });

  it('network: connection reset', () => {
    expect(classifyError(new Error('read ECONNRESET')).category).toBe('network');
  });

  it('network: timeout', () => {
    expect(classifyError(new Error('ETIMEDOUT')).category).toBe('network');
  });

  it('codec: mpv EXIT_FATAL naming a codec', () => {
    const r = classifyError(
      new Error('EXIT_FATAL: no decoder for codec hevc (MediaCodec)'),
    );
    expect(r.category).toBe('codec');
    expect(r.title).toBe("Can't play this video");
    // Codec failures offer the mpv-native software-decode retry.
    expect(r.actions[0]).toBe('software-decode');
  });

  it('codec: requires BOTH a codec token and a failure token', () => {
    // "codec" alone (benign metadata) must NOT classify as codec.
    expect(classifyError(new Error('codec: h264')).category).not.toBe('codec');
  });

  it('unsupported: EOF after seek beyond duration', () => {
    const r = classifyError(
      new Error('seek to position 999999 failed: EOF, out of range'),
    );
    expect(r.category).toBe('unsupported');
    expect(r.actions[0]).toBe('reset-to-zero');
  });

  it('expired: 401 / missing API key', () => {
    const r = classifyError(new Error('HTTP 401 Unauthorized'));
    expect(r.category).toBe('expired');
    expect(r.retryable).toBe(false);
    expect(r.actions).toContain('reauth');
  });

  it('expired: 403 is NOT reported as network', () => {
    // 403 must not be absorbed by the broad network rule.
    expect(classifyError(new Error('HTTP 403 Forbidden')).category).toBe('expired');
  });

  it('expired: pre-classified StreamError passes through', () => {
    const r = classifyError({kind: 'expired', message: 'x', reAuthAvailable: true});
    expect(r.category).toBe('expired');
    expect(r.cause).toBeDefined();
  });

  it('blocked: another player owns the session', () => {
    const r = classifyError(
      new Error('another player is already active on this device'),
    );
    expect(r.category).toBe('blocked');
    expect(r.actions[0]).toBe('stop-other');
    // Retrying without stopping the other player reproduces the
    // same failure, so it is not retryable on its own.
    expect(r.retryable).toBe(false);
  });

  it('unknown: the documented catch-all', () => {
    const r = classifyError(new Error('something odd happened'));
    expect(r.category).toBe('unknown');
    expect(r.title).toBe('Something went wrong');
    expect(r.actions).toEqual(['retry', 'close']);
  });
});

describe('classifyError — never throws / always actionable', () => {
  const junk: unknown[] = [
    undefined,
    null,
    0,
    -1,
    NaN,
    '',
    '   ',
    {},
    [],
    Symbol('x'),
    () => 0,
    new Map(),
    {message: 42},
    {nested: {deep: {deeper: 'ECONNRESET'}}},
  ];

  it.each(junk.map((v, i) => [i, v]))(
    'classifies junk input #%i without throwing',
    (_i, v) => {
      const r = classifyError(v);
      expect(r).toBeDefined();
      expect(typeof r.title).toBe('string');
      expect(r.title.length).toBeGreaterThan(0);
      expect(typeof r.message).toBe('string');
      expect(Array.isArray(r.actions)).toBe(true);
      expect(typeof r.retryable).toBe('boolean');
    },
  );

  it('every category has copy + at least one recovery action', () => {
    const categories: ErrorCategory[] = [
      'network',
      'codec',
      'unsupported',
      'expired',
      'blocked',
      'unknown',
    ];
    for (const c of categories) {
      // Force each category through a representative input.
      const sample = classifyError(
        {
          network: 'HTTP 500',
          codec: 'decoder failure: av1 codec not supported',
          unsupported: 'seek position out of bounds EOF',
          expired: '401 unauthorized',
          blocked: 'another player is active',
          unknown: 'weird',
        }[c],
      );
      expect(sample.category).toBe(c);
      expect(sample.title.length).toBeGreaterThan(0);
      expect(sample.message.length).toBeGreaterThan(0);
      expect(sample.actions.length).toBeGreaterThan(0);
    }
  });
});

describe('classifyError — fuzz (deterministic)', () => {
  /**
   * Seeded LCG so a failure is always reproducible. Real fuzzing
   * here means: "throw arbitrary strings/objects at the classifier
   * and prove it never throws and always returns a complete
   * ClassifiedError". It does NOT assert a specific category —
   * the point is total-function behaviour, not classification
   * accuracy on random noise.
   */
  it('never throws and always returns a complete result (500 iterations)', () => {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789 /.:-_';
    const makeString = (n: number) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        s += alphabet[Math.floor(rand() * alphabet.length)];
      }
      return s;
    };

    const categories = new Set<ErrorCategory>();
    for (let i = 0; i < 500; i++) {
      const roll = rand();
      const input: unknown =
        roll < 0.5
          ? makeString(Math.floor(rand() * 40))
          : roll < 0.8
            ? {message: makeString(Math.floor(rand() * 40))}
            : {code: makeString(6), reason: makeString(10)};
      const r = classifyError(input);
      expect(typeof r.title).toBe('string');
      expect(r.title.length).toBeGreaterThan(0);
      expect(Array.isArray(r.actions)).toBe(true);
      expect(r.actions.length).toBeGreaterThan(0);
      categories.add(r.category);
    }
    // The fuzz run should land on the catch-all at least once —
    // proving the fallback branch is reachable, not dead code.
    expect(categories.has('unknown')).toBe(true);
  });
});
