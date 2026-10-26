/**
 * `formatPositionLine` / `formatPositionAccessibility` — a media card has
 * two time facts, and the position one appears only when there IS a
 * position.
 *
 * ## The defect this pins
 *
 * A card with no resume position used to render
 *
 *     " / 21:58"
 *
 * — a line that opens with a separator and claims a position that does not
 * exist. The accessibility label did the same in prose:
 *
 *     "The Rifle,  of 21:58"
 *
 * with a dangling "of" and nothing in front of it.
 *
 * The cause was `formatDuration(0)` returning `''`. That empty string is
 * CORRECT and load-bearing: a duration of zero means "unknown", and
 * printing `0:00` in its place would claim the media is zero seconds long
 * — a lie on a grid badge, on a stats card, and on a history row. So the
 * formatter keeps its contract and the CARDS stop composing a position
 * that is not there.
 *
 * These tests pin the CARDS' side of that decision, and they pin it
 * together: a fix that made the visible line right but left the spoken
 * label dangling would fail here.
 */

import {
  formatPositionAccessibility,
  formatPositionLine,
} from '../../src/utils/mediaTime';

describe('formatPositionLine', () => {
  it('renders "position / duration" when there is a position', () => {
    expect(formatPositionLine(97, 1318)).toBe('1:37 / 21:58');
  });

  it('renders the duration ALONE when there is no position', () => {
    // The regression. The old template printed the separator regardless.
    expect(formatPositionLine(0, 1318)).toBe('21:58');
    expect(formatPositionLine(undefined, 1318)).toBe('21:58');
  });

  it('renders nothing at all when the duration is unknown', () => {
    // `undefined`, not '': the caller renders the line only when there is
    // one, and an empty <Text> is a layout artefact rather than a line.
    expect(formatPositionLine(97, 0)).toBeUndefined();
    expect(formatPositionLine(0, undefined)).toBeUndefined();
    expect(formatPositionLine(undefined, undefined)).toBeUndefined();
  });

  it('never opens with a separator', () => {
    const line = formatPositionLine(0, 1318);

    expect(line).toBeDefined();
    expect(line!.startsWith('/')).toBe(false);
    expect(line!.startsWith(' /')).toBe(false);
    expect(line).not.toMatch(/\s\/\s*$/);
  });

  it('keeps a position of 0 out of the line', () => {
    // "0:00 / 21:58" would claim the media is zero seconds long.
    expect(formatPositionLine(0, 1318)).not.toContain('0:00');
  });
});

describe('formatPositionAccessibility', () => {
  it('names the position and the duration when there is a position', () => {
    expect(formatPositionAccessibility('The Rifle', 97, 1318)).toBe(
      'The Rifle, 1:37 of 21:58',
    );
  });

  it('never leaves a dangling "of"', () => {
    // The regression, in prose. The old shape printed the position segment
    // unconditionally, which produced "The Rifle,  of 21:58".
    const label = formatPositionAccessibility('The Rifle', 0, 1318);

    expect(label).toBe('The Rifle, 21:58 long');
    expect(label).not.toMatch(/,\s*,/);
    expect(label).not.toMatch(/\bof\b\s*$/);
  });

  it('falls back to the title when there is no duration at all', () => {
    expect(formatPositionAccessibility('The Rifle', 0, 0)).toBe('The Rifle');
    expect(formatPositionAccessibility('The Rifle', undefined, undefined)).toBe(
      'The Rifle',
    );
  });

  it('never claims a position of 0:00', () => {
    expect(formatPositionAccessibility('The Rifle', 0, 1318)).not.toContain(
      '0:00',
    );
  });
});
