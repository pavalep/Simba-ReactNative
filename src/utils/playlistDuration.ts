import type {DurationUnit} from '../types/playlist';

export type {DurationUnit};

/**
 * The id prefix the playlist importers gave the records they created.
 *
 * It is the ONE provenance signal the persisted schema carried before
 * the unit flag existed, and the legacy inference below leans on it:
 * a record the app picked itself was never given an `imp_` id, so an
 * `imp_` record is a record an importer wrote.
 */
const IMPORT_ID_PREFIX = 'imp_';

/**
 * The lower bound of the legacy window, in the unit the number would
 * have to be read as SECONDS for it to be implausible.
 *
 * One hour. No single file in a playlist is an hour of audio that the
 * user picked as a track, so a number this big cannot be a duration.
 */
const LEGACY_MIN_SECONDS = 3600;

/**
 * The upper bound of the legacy window, in the unit the number would
 * have to be read as MILLISECONDS for it to be plausible.
 *
 * A day. The old importer multiplied an `#EXTINF` second count by
 * 1000, and no `#EXTINF` carries more than a day's worth of seconds,
 * so a number above this is not one of the old importer's.
 */
const LEGACY_MAX_SECONDS = 86400;

/** A persisted playlist item's duration, as it may be found on disk. */
export interface PersistedDuration {
  id: string;
  duration: number;
  durationUnit?: DurationUnit;
}

/**
 * TRUE when a record was written by one of the playlist importers.
 */
function isImportedRecord(id: string): boolean {
  return typeof id === 'string' && id.startsWith(IMPORT_ID_PREFIX);
}

/**
 * TRUE when a LEGACY record - one written before the unit flag
 * existed - holds a millisecond value.
 *
 * ## What is known for certain
 *
 * The old M3U importer wrote `parsedSeconds * 1000`, so every
 * millisecond value it wrote is a whole number of seconds times 1000.
 * A legacy record whose number is NOT a multiple of 1000 therefore
 * cannot be one of its - it is seconds, and it is left alone.
 *
 * ## What is inferred
 *
 * A legacy record whose number IS a multiple of 1000 could be either.
 * Two bounds break the tie, and they are both about implausibility:
 *
 *   - read as SECONDS, the number has to be at least an hour, because
 *     no track in a playlist is an hour long;
 *   - read as MILLISECONDS, the number has to be at most a day, because
 *     that is the most the old importer could have written.
 *
 * ## What this cannot decide
 *
 * A legacy record that is a multiple of 1000 and sits BELOW the lower
 * bound - a 1000, 2000 or 3000 - is left exactly as it was. It could
 * be seconds (a 16, 33 or 50 minute track) or milliseconds (a 1, 2 or
 * 3 second clip), and nothing in the record says which. The rule
 * above is applied, not guessed around: the value is not touched.
 */
export function isLegacyMillisecondDuration(record: PersistedDuration): boolean {
  const {id, duration} = record;
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }
  if (!isImportedRecord(id)) {
    return false;
  }
  if (duration % 1000 !== 0) {
    return false;
  }
  if (duration < LEGACY_MIN_SECONDS) {
    return false;
  }
  if (duration / 1000 > LEGACY_MAX_SECONDS) {
    return false;
  }
  return true;
}

/**
 * TRUE when a legacy record's number cannot have come from the old
 * M3U importer, and so is seconds.
 */
export function isLegacySecondDuration(record: PersistedDuration): boolean {
  const {duration} = record;
  if (!Number.isFinite(duration) || duration < 0) {
    return false;
  }
  // The old importer's arithmetic: `seconds * 1000`.
  return duration % 1000 !== 0;
}

/**
 * The duration of a persisted record, in SECONDS, plus the unit the
 * record should carry from now on.
 *
 * Every record converges on SECONDS: a record that DECLARES a unit is
 * converted to it, and a legacy record is resolved by the rule above.
 * A record whose unit stays unknown keeps no unit flag, so the rule
 * is applied again on the next read.
 */
export function resolveDuration(record: PersistedDuration): {
  seconds: number;
  unit?: DurationUnit;
  migrated: boolean;
} {
  const {duration, durationUnit} = record;

  if (durationUnit === 'milliseconds') {
    const seconds = duration / 1000;
    return {seconds, unit: 'seconds', migrated: seconds !== duration};
  }

  if (durationUnit === 'seconds') {
    return {seconds: duration, unit: 'seconds', migrated: false};
  }

  if (isLegacyMillisecondDuration(record)) {
    return {seconds: duration / 1000, unit: 'seconds', migrated: true};
  }

  if (isLegacySecondDuration(record)) {
    return {seconds: duration, unit: 'seconds', migrated: false};
  }

  // Unknown: the number is left exactly as it was found.
  return {seconds: duration, unit: undefined, migrated: false};
}