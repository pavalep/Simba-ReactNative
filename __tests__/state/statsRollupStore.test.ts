/// <reference types="node" />
/**
 * The Stats roll-up: the app's LIFETIME play ledger.
 *
 * The Stats screen used to read a TRANSIENT session store for its play
 * counts and its played-media roll-up, so a cold start emptied it and
 * the screen said "Plays 0" beside a real day streak.
 *
 * This suite is the cold-start proof: what the store records is what
 * the next launch reads back.
 */

// This file is a MODULE: it declares `MMKVShape`, `flush` and `loadStore`,
// and the sibling suite in this folder declares the same three names. A file
// without an import or an export is a SCRIPT, and two scripts in one
// project share one global scope.
export {};

type MMKVShape = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
};

/** Let the persist middleware's promise chain settle. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Load the store, optionally against a seeded `statsRollup` blob.
 *
 * The module registry is reset first so the store is CREATED against
 * the seeded blob (it hydrates at import time), and the mock is
 * re-required after the reset so the test and the store share one Map.
 */
async function loadStore(seed?: Record<string, unknown>) {
  jest.resetModules();
  const {CURRENT_PERSIST_VERSION} = require('../../src/state/persistence');
  const {MMKV} = require('react-native-mmkv');
  const mmkv: MMKVShape = new MMKV({id: 'simba'});
  if (seed) {
    mmkv.set(
      'statsRollup',
      JSON.stringify({state: seed, version: CURRENT_PERSIST_VERSION}),
    );
  }

  const {useStatsRollupStore} = require('../../src/state/statsRollupStore');
  await flush();
  await flush();

  return {useStatsRollupStore, mmkv};
}

const play = (
  useStatsRollupStore: {
    getState: () => {
      recordPlaybackStats: (input: Record<string, unknown>) => void;
    };
  },
  fileUri = 'file:///music/track.mp3',
  title = 'A track',
  duration = 300,
  sessionId?: number,
) =>
  useStatsRollupStore.getState().recordPlaybackStats({
    fileUri,
    title,
    duration,
    mediaType: 'audio',
    type: 'music',
    source: 'local',
    ...(sessionId !== undefined ? {sessionId} : {}),
  });

describe('useStatsRollupStore — the lifetime play ledger', () => {
  it('records a play with its count, its duration and its timestamp', async () => {
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore);

    const record = useStatsRollupStore.getState().plays['file:///music/track.mp3'];
    expect(record.count).toBe(1);
    expect(record.duration).toBe(300);
    expect(record.mediaType).toBe('audio');
    expect(record.lastPlayedAt).toBeGreaterThan(0);
    expect(record.firstPlayedAt).toBeTruthy();
  });

  it('counts a second SESSION of the same file as a second play', async () => {
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 1);
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 2);

    const record = useStatsRollupStore.getState().plays['file:///music/track.mp3'];
    expect(record.count).toBe(2);
    expect(Object.keys(useStatsRollupStore.getState().plays)).toHaveLength(1);
  });

  it('does NOT count another CHECKPOINT of the same session as a play', async () => {
    // The resume writer writes a checkpoint every thirty seconds and
    // once more when the session ends. Counting the writes would report
    // one viewing of a film as a hundred plays.
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 7);
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 7);
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 7);

    const record = useStatsRollupStore.getState().plays['file:///music/track.mp3'];
    expect(record.count).toBe(1);
  });

  it('counts a second file separately', async () => {
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore);
    play(useStatsRollupStore, 'file:///music/other.mp3', 'Another', 120);

    const plays = useStatsRollupStore.getState().plays;
    expect(Object.keys(plays)).toHaveLength(2);
    expect(plays['file:///music/other.mp3'].duration).toBe(120);
  });

  it('SURVIVES A COLD START — the ledger is on the disk', async () => {
    const {useStatsRollupStore, mmkv} = await loadStore();
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 1);
    play(useStatsRollupStore, 'file:///music/track.mp3', 'A track', 300, 2);
    await flush();

    const raw = mmkv.getString('statsRollup');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.plays['file:///music/track.mp3'].count).toBe(2);

    // And the next launch reads it back.
    const next = await loadStore(parsed.state);
    const record = next.useStatsRollupStore.getState().plays['file:///music/track.mp3'];
    expect(record.count).toBe(2);
    expect(record.duration).toBe(300);
  });

  it('counts the day a play happened on', async () => {
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore);

    const {activeDays} = useStatsRollupStore.getState();
    const days = Object.keys(activeDays);
    expect(days).toHaveLength(1);
    expect(activeDays[days[0]]).toBe(1);
  });

  it('drops the OLDEST day when the day ledger is over its cap', async () => {
    const {MAX_ACTIVE_DAYS} = require('../../src/state/statsRollupStore');

    // The 400 days BEFORE today, so today's play is the one that
    // pushes the ledger over its cap.
    const seeded: Record<string, number> = {};
    const oldest = new Date();
    oldest.setDate(oldest.getDate() - MAX_ACTIVE_DAYS);
    const oldestKey =
      `${oldest.getFullYear()}-${`${oldest.getMonth() + 1}`.padStart(2, '0')}-` +
      `${oldest.getDate()}`.padStart(2, '0');
    for (let i = 0; i < MAX_ACTIVE_DAYS; i += 1) {
      const day = new Date(oldest);
      day.setDate(oldest.getDate() + i);
      const key =
        `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, '0')}-` +
        `${day.getDate()}`.padStart(2, '0');
      seeded[key] = 1;
    }

    const {useStatsRollupStore} = await loadStore({plays: {}, activeDays: seeded});
    play(useStatsRollupStore);

    const {activeDays} = useStatsRollupStore.getState();
    expect(Object.keys(activeDays)).toHaveLength(MAX_ACTIVE_DAYS);
    // The oldest day is gone; today is in.
    expect(activeDays[oldestKey]).toBeUndefined();
    expect(Object.values(activeDays)).toContain(1);
  });

  it('clears both ledgers on reset — the sign-out path', async () => {
    const {useStatsRollupStore} = await loadStore();
    play(useStatsRollupStore);

    useStatsRollupStore.getState().reset();

    const state = useStatsRollupStore.getState();
    expect(state.plays).toEqual({});
    expect(state.activeDays).toEqual({});
  });
});

describe('the local day key', () => {
  it('is padded, so the keys sort as dates', () => {
    const {localDayKey} = require('../../src/state/statsRollupStore');

    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDayKey(new Date(2026, 10, 30))).toBe('2026-11-30');
  });

  it('is LOCAL, not UTC', () => {
    const {localDayKey} = require('../../src/state/statsRollupStore');

    const late = new Date(2026, 5, 15, 23, 30);
    const early = new Date(2026, 5, 15, 0, 30);
    expect(localDayKey(late)).toBe(localDayKey(early));
  });
});