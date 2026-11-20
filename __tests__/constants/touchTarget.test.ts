/**
 * The app's touch-target floor — ONE owner.
 *
 * The floor used to be a private number in the player's control system
 * (`PlayerControl.CONTROL_TARGET = 44`), and the app's own comments
 * cited it as if it were the app's. That is why it was applied nowhere
 * else: a number in one component's folder is that component's number.
 *
 * These tests are SOURCE GUARDS: they read the files and assert that the
 * floor is READ from the owner rather than written again. A second copy
 * of the number is how it drifts.
 */

import fs from 'fs';
import path from 'path';
import {TOUCH_TARGET, touchTargetReach} from '../../src/constants/touchTarget';

const SRC = path.resolve(__dirname, '../../src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');

describe('the touch-target floor and its one owner', () => {
  it('is 44 dp', () => {
    expect(TOUCH_TARGET).toBe(44);
  });

  it('has ONE owner — the player reads it rather than writing it', () => {
    const player = read(
      'components/player/shared/PlayerControl/PlayerControl.tsx',
    );
    expect(player).toContain('export const CONTROL_TARGET = TOUCH_TARGET;');
    expect(player).not.toMatch(/CONTROL_TARGET\s*=\s*44/);
  });

  it('has ONE owner — the browse footer reads it rather than writing it', () => {
    const footer = read('screens/_shared/BrowseListFooter.tsx');
    expect(footer).toContain('minHeight: TOUCH_TARGET');
    expect(footer).not.toMatch(/minHeight:\s*44/);
  });

  it('has ONE owner — the chips read it rather than writing it', () => {
    const chips = read('components/utility/FilterChips/FilterChips.tsx');
    expect(chips).toContain('minHeight: TOUCH_TARGET');
    expect(chips).not.toMatch(/minHeight:\s*44/);

    const sheet = read('components/sheets/FilterSheet/FilterSheet.tsx');
    expect(sheet).toContain('touchTargetReach');
  });

  it('the reach maths reaches the floor, and only reaches', () => {
    // A 32 dp chip needs 6 dp on each side to answer to 44.
    expect(touchTargetReach(32)).toBe(6);
    expect(touchTargetReach(32) * 2 + 32).toBeGreaterThanOrEqual(TOUCH_TARGET);

    // A control that already meets the floor reaches nowhere.
    expect(touchTargetReach(44)).toBe(0);
    expect(touchTargetReach(56)).toBe(0);
  });
});
