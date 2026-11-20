import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import {normalizeMediaClassification} from '../types/media';

/**
 * The Stats roll-up: the app's LIFETIME playback ledger.
 *
 * ## Why this store exists
 *
 * The Stats screen used to read two stores and disagree with itself.
 * `sessionStore` held the play counts and the played-media roll-up, but
 * it was TRANSIENT - it had no `persist` - so a cold start emptied it.
 * The screen then said "Plays 0" and "Tracks 0" beside a day streak
 * that was real, because the streak came from the persisted
 * recent-history store. Ten entries of history cannot say "Plays 3812".
 *
 * The old store's own comment claimed the roll-up was "recomputed at
 * runtime from the recentHistory feature's persisted history on cold
 * start". Nothing recomputed it, and it could not have: a ten-entry
 * recency list does not know that a film was played five times.
 *
 * ## What it owns now
 *
 * Two ledgers, both persisted, both timestamped:
 *
 *   - `plays` - one record per media file, carrying the play COUNT and
 *     the time of the last play. Every lifetime number on the Stats
 *     screen (plays, playback time, tracks, videos, most played) is
 *     derived from this one ledger.
 *   - `activeDays` - one entry per local calendar day, carrying the
 *     plays that happened on it. "Days Active" and "Day Streak" are
 *     counted from this one ledger. They used to be counted from the
 *     ten-entry recency list, so they could never exceed ten.
 *
 * ## Why the two ledgers are not one
 *
 * A file's LAST play says when it was last watched. It does not say
 * which days were active. A day ledger derived from the files would
 * need every play event, and the recency list would have to grow
 * without bound to be right. So the days are counted as they happen.
 *
 * ## The unit of `duration`
 *
 * SECONDS, like every other duration in the app.
 */

/**
 * How many days the day ledger keeps.
 *
 * Four hundred days is about thirteen months. The ledger answers
 * "how many days have you been active, and what is your streak", and a
 * streak longer than a year is not a statistic anybody reads. The
 * oldest day is dropped when the cap is crossed.
 */
export const MAX_ACTIVE_DAYS = 400;

/**
 * A local calendar day key, zero-padded so the keys sort as strings.
 *
 * LOCAL, not UTC: a play at 11pm belongs to the day the user lived,
 * not to the day it was in Greenwich. The padding is what makes the
 * key sortable, which is how the oldest day is found when the cap is
 * crossed.
 */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * One media file's lifetime play record.
 *
 * The record is the file's identity in the ledger: the key is the
 * file URI. `count` is how many times it was played, `lastPlayedAt`
 * is when it was played last, and `firstPlayedAt` is when the app
 * first saw it.
 */
export interface PlayedMedia {
  /**
   * How many times the file has been PLAYED.
   *
   * A playback is a session, not a checkpoint. The resume writer writes
   * a checkpoint every thirty seconds and once more when the session
   * ends, so counting the writes would report one viewing of a film as
   * a hundred plays. The count rises when a NEW session starts, and
   * never on another checkpoint of the session already counted.
   */
  count: number;
  /**
   * The playback session the last write came from.
   *
   * A session id is monotonic per launch, so a session id that is not
   * the one already recorded IS a new viewing of the same file.
   */
  lastSessionId?: number;
  /** Epoch milliseconds of the most recent play. */
  lastPlayedAt: number;
  /** ISO timestamp of the first play. */
  firstPlayedAt: string;
  title: string;
  /** SECONDS. */
  duration: number;
  mediaType: MediaLane;
  type: MediaKind;
  source: MediaSource;
}

export interface StatsRollupState {
  /** fileUri -> the file's play record. THE lifetime play ledger. */
  plays: Record<string, PlayedMedia>;
  /** Local day key -> the plays that happened on that day. */
  activeDays: Record<string, number>;
}

export interface StatsRollupActions {
  /**
   * Record one playback. Called from the recent-history feature's
   * write path, which already records the row in its own persisted
   * store.
   */
  recordPlaybackStats: (input: {
    fileUri: string;
    title: string;
    duration: number;
    /**
     * The playback session this write belongs to.
     *
     * It is what separates "the user started this again" from "the
     * thirty-second checkpoint fired again".
     */
    sessionId?: number;
    mediaType?: MediaLane;
    type?: MediaKind;
    source?: MediaSource;
    provider?: string;
    folderId?: string;
  }) => void;
  /** Clear both ledgers. Called when the user signs out. */
  reset: () => void;
}

const initialState: StatsRollupState = {
  plays: {},
  activeDays: {},
};

/**
 * The day ledger, with the oldest day dropped when it is over the cap.
 *
 * The keys are `YYYY-MM-DD`, so sorting them as strings sorts them by
 * date - which is why the key is padded.
 */
const trimDays = (days: Record<string, number>): Record<string, number> => {
  const keys = Object.keys(days);
  if (keys.length <= MAX_ACTIVE_DAYS) {
    return days;
  }
  const kept = keys.sort().slice(-MAX_ACTIVE_DAYS);
  const trimmed: Record<string, number> = {};
  for (const key of kept) {
    trimmed[key] = days[key];
  }
  return trimmed;
};

export const useStatsRollupStore = create<StatsRollupState & StatsRollupActions>()(
  persist(
    (set) => ({
      ...initialState,

      recordPlaybackStats: (input) =>
        set((state) => {
          const {fileUri, title, duration, mediaType, type, source, provider, folderId} =
            input;
          const {sessionId} = input;
          const now = Date.now();
          const existing = state.plays[fileUri];

          // A PLAY is a session. A checkpoint is not a play: the resume
          // writer writes one every thirty seconds and once more when
          // the session ends, so counting the writes would report one
          // viewing of a film as a hundred plays. A session id that is
          // not the one already recorded IS a new viewing.
          const isNewPlayback =
            !existing ||
            (sessionId !== undefined && sessionId !== existing.lastSessionId);

          const record: PlayedMedia = existing
            ? {
                ...existing,
                count: existing.count + (isNewPlayback ? 1 : 0),
                lastPlayedAt: now,
                ...(sessionId !== undefined ? {lastSessionId: sessionId} : {}),
                // A first play often lands before the duration is
                // known (a stream reports 0). A later play that knows
                // it fills the gap; a later play that does not leave
                // the known value alone.
                duration: existing.duration || Math.max(0, duration),
                title: existing.title || title,
              }
            : {
                count: 1,
                lastPlayedAt: now,
                firstPlayedAt: new Date(now).toISOString(),
                ...(sessionId !== undefined ? {lastSessionId: sessionId} : {}),
                title,
                duration: Math.max(0, duration),
                ...normalizeMediaClassification({
                  source,
                  type,
                  mediaType,
                  provider,
                  folderId,
                }),
              };

          const plays = {...state.plays, [fileUri]: record};

          const day = localDayKey(new Date(now));
          const activeDays = trimDays({
            ...state.activeDays,
            [day]: (state.activeDays[day] ?? 0) + 1,
          });

          return {plays, activeDays};
        }),

      reset: () => set({...initialState}),
    }),
    {
      name: 'statsRollup',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);