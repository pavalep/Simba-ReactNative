/// <reference types="node" />
/**
 * The playlist duration's UNIT, and the M3U residue.
 *
 * `PlaylistItem.duration` is SECONDS everywhere in the app. One
 * producer disagreed: the pre-fix M3U importer multiplied the parsed
 * `#EXTINF` seconds by 1000, so a playlist imported before that fix
 * holds a number that reads 1000x too long.
 *
 * The fix is a per-record provenance flag (`durationUnit`) plus a rule
 * for the records that predate it. This suite is that rule: it is the
 * ONE place that decides what a number means.
 */
import {
  isLegacyMillisecondDuration,
  isLegacySecondDuration,
  resolveDuration,
} from '../../src/utils/playlistDuration';

describe('the playlist duration unit', () => {
  describe('a record that declares its unit', () => {
    it('keeps a seconds record exactly as it is', () => {
      const resolved = resolveDuration({
        id: 'imp_1_0',
        duration: 300,
        durationUnit: 'seconds',
      });

      expect(resolved.seconds).toBe(300);
      expect(resolved.unit).toBe('seconds');
      expect(resolved.migrated).toBe(false);
    });

    it('converts a milliseconds record to seconds', () => {
      const resolved = resolveDuration({
        id: 'imp_1_0',
        duration: 300000,
        durationUnit: 'milliseconds',
      });

      expect(resolved.seconds).toBe(300);
      expect(resolved.unit).toBe('seconds');
      expect(resolved.migrated).toBe(true);
    });
  });

  describe('a LEGACY record — written before the flag existed', () => {
    it('is seconds when its number is not a multiple of 1000', () => {
      // The old M3U importer's arithmetic was `seconds * 1000`, so a
      // number that is not a multiple of 1000 cannot be one of its.
      const resolved = resolveDuration({id: 'imp_1_0', duration: 312});

      expect(resolved.seconds).toBe(312);
      expect(resolved.unit).toBe('seconds');
    });

    it('is MILLISECONDS when the number is impossible as seconds', () => {
      // The residue: a three-minute track imported before the fix was
      // stored as 180000, which reads as fifty hours.
      const resolved = resolveDuration({id: 'imp_1_0', duration: 180000});

      expect(resolved.seconds).toBe(180);
      expect(resolved.unit).toBe('seconds');
      expect(resolved.migrated).toBe(true);
    });

    it('is MILLISECONDS for a clip as short as four seconds', () => {
      // The rule's floor is 3.6 seconds: below that the number is
      // ambiguous and is left alone.
      const resolved = resolveDuration({id: 'imp_2_0', duration: 4000});

      expect(resolved.seconds).toBe(4);
    });

    it('leaves an AMBIGUOUS number exactly as it was', () => {
      // 1000 could be 1000 seconds (a 16 minute track) or 1 second.
      // Nothing in the record says which, so the rule is applied and
      // the value is not touched.
      const resolved = resolveDuration({id: 'imp_1_0', duration: 1000});

      expect(resolved.seconds).toBe(1000);
      expect(resolved.unit).toBeUndefined();
      expect(resolved.migrated).toBe(false);
    });

    it('leaves a record the app picked itself alone', () => {
      // The app's own picker never used the `imp_` prefix, and it
      // always wrote seconds.
      const resolved = resolveDuration({id: 'pli_123', duration: 180000});

      expect(resolved.seconds).toBe(180000);
      expect(resolved.unit).toBeUndefined();
    });

    it('leaves a number that is impossible as milliseconds alone', () => {
      // 100000000 ms would be 27 hours - the old importer could not
      // have written it, so it is not one of its.
      const resolved = resolveDuration({id: 'imp_1_0', duration: 100000000});

      expect(resolved.seconds).toBe(100000000);
      expect(resolved.unit).toBeUndefined();
    });
  });

  describe('the two legacy predicates', () => {
    it('agree on a residue record', () => {
      const record = {id: 'imp_1_0', duration: 180000};

      expect(isLegacyMillisecondDuration(record)).toBe(true);
      expect(isLegacySecondDuration(record)).toBe(false);
    });

    it('agree on an ordinary record', () => {
      const record = {id: 'imp_1_0', duration: 312};

      expect(isLegacyMillisecondDuration(record)).toBe(false);
      expect(isLegacySecondDuration(record)).toBe(true);
    });

    it('never calls a zero a millisecond value', () => {
      expect(isLegacyMillisecondDuration({id: 'imp_1_0', duration: 0})).toBe(false);
    });
  });
});