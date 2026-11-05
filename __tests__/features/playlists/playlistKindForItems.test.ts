/**
 * `playlistKindForItems` — the ONE owner of "what kind is this playlist".
 *
 * ## Why this file exists
 *
 * A playlist holds ONE lane. A set of items that crosses lanes cannot
 * become a playlist, and the question "can these items make one?" has to
 * have exactly ONE answer in the app — otherwise the queue screen's
 * "save as playlist" and the store's own lane rule can disagree.
 *
 * So the rule is a pure function in the playlists feature facade
 * (`playlistKindForItems`), the queue screen asks it, and this file pins
 * it.
 *
 * ## What this pins
 *
 *  1. Audio items make an AUDIO_ONLY playlist; video items make a
 *     VIDEO_ONLY one.
 *  2. Items that cross lanes make NO playlist — null, not a guess.
 *  3. No items make no playlist either.
 */

import {playlistKindForItems, CROSS_LANE_QUEUE_REASON} from '../../../src/features/playlists';

const AUDIO = {mediaType: 'audio' as const};
const VIDEO = {mediaType: 'video' as const};

describe('playlistKindForItems — the kind a set of items would make', () => {
  it('makes an AUDIO_ONLY playlist from audio items', () => {
    expect(playlistKindForItems([AUDIO])).toBe('AUDIO_ONLY');
    expect(playlistKindForItems([AUDIO, AUDIO])).toBe('AUDIO_ONLY');
  });

  it('makes a VIDEO_ONLY playlist from video items', () => {
    expect(playlistKindForItems([VIDEO])).toBe('VIDEO_ONLY');
    expect(playlistKindForItems([VIDEO, VIDEO])).toBe('VIDEO_ONLY');
  });

  it('makes NO playlist from items that cross lanes', () => {
    expect(playlistKindForItems([AUDIO, VIDEO])).toBeNull();
    expect(playlistKindForItems([VIDEO, AUDIO])).toBeNull();
  });

  it('makes NO playlist from no items', () => {
    expect(playlistKindForItems([])).toBeNull();
  });
});

describe('the cross-lane reason', () => {
  it('names both sides and says what a playlist is', () => {
    // A reason that does not explain the block is a reason the user cannot
    // act on.
    expect(CROSS_LANE_QUEUE_REASON).toContain('audio');
    expect(CROSS_LANE_QUEUE_REASON).toContain('video');
    expect(CROSS_LANE_QUEUE_REASON).toContain('playlist');
  });
});
