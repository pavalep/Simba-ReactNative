// ─── V21 W6 P21 — Adapter error helpers tests ─────────────────────────
//
// Covers the shared primitives in `adapterErrors.ts`. The per-adapter
// `parseWireShape` functions are exercised in each adapter's own test
// file; this file is just the foundation.

import {
  AdapterParseError,
  isRecord,
  isFiniteNumber,
  isNonEmptyString,
  isString,
  isArray,
  assertShape,
} from '../../../src/infrastructure/api/adapterErrors';

describe('adapterErrors — V21 W6 P21', () => {
  describe('AdapterParseError', () => {
    it('sets name, provider, path + a meaningful message', () => {
      const err = new AdapterParseError(
        'podcastIndex',
        'feeds[0].id',
        'expected finite number',
      );
      expect(err.name).toBe('AdapterParseError');
      expect(err.provider).toBe('podcastIndex');
      expect(err.path).toBe('feeds[0].id');
      expect(err.message).toBe(
        '[podcastIndex] feeds[0].id: expected finite number',
      );
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('isRecord', () => {
    it('accepts plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({a: 1, b: 'x'})).toBe(true);
    });
    it('rejects null + arrays + primitives', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('isFiniteNumber', () => {
    it('accepts finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(42)).toBe(true);
      expect(isFiniteNumber(-3.14)).toBe(true);
    });
    it('rejects NaN, Infinity, non-numbers', () => {
      expect(isFiniteNumber(NaN)).toBe(false);
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
      expect(isFiniteNumber('1')).toBe(false);
      expect(isFiniteNumber(null)).toBe(false);
      expect(isFiniteNumber(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('accepts non-empty strings', () => {
      expect(isNonEmptyString('x')).toBe(true);
      expect(isNonEmptyString('hello world')).toBe(true);
    });
    it('rejects empty + non-strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('isString', () => {
    it('accepts empty + non-empty strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('x')).toBe(true);
    });
    it('rejects non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('accepts arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 'x', null])).toBe(true);
    });
    it('rejects non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('assertShape', () => {
    it('returns the value when the guard accepts', () => {
      const result = assertShape(
        {a: 1},
        'root',
        'test',
        isRecord,
      );
      expect(result).toEqual({a: 1});
    });

    it('throws AdapterParseError when the guard rejects', () => {
      expect(() =>
        assertShape(null, 'items', 'podcastIndex', isArray),
      ).toThrow(AdapterParseError);
    });

    it('the thrown error includes the path + provider', () => {
      let caught: unknown;
      try {
        assertShape('not a number', 'count', 'jamendo', isFiniteNumber);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AdapterParseError);
      const ape = caught as AdapterParseError;
      expect(ape.provider).toBe('jamendo');
      expect(ape.path).toBe('count');
      expect(ape.message).toMatch(/\[jamendo\] count:/);
    });

    it('accepts a custom message override', () => {
      let caught: unknown;
      try {
        // `[1, 2]` fails `isRecord` (arrays are excluded by design)
        assertShape(
          [1, 2],
          'config',
          'musicbrainz',
          isRecord,
          'config object required',
        );
      } catch (err) {
        caught = err;
      }
      expect((caught as AdapterParseError).message).toBe(
        '[musicbrainz] config: config object required',
      );
    });
  });
});