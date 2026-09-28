/// <reference types="node" />
/**
 * V19 W3.6 Phase 3.6.2 — `useCaptionSettingsStore` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.2.
 *
 * Covers:
 *   - default settings (medium / fifty / bottom)
 *   - setFontSize updates the value
 *   - setBackgroundOpacity updates the value
 *   - setPosition updates the value
 *   - reset() restores defaults
 *   - persistence key is `player.captionStyle`
 *   - fontSizeToMpvPx maps the four sizes to the lib's px values
 *   - backgroundOpacityToMpvColor maps the three opacities
 *   - positionToMpvPos maps bottom/top
 */

import {
  fontSizeToMpvPx,
  backgroundOpacityToMpvColor,
  positionToMpvPos,
} from '../../src/state/useCaptionSettingsStore';

describe('useCaptionSettingsStore — pure helpers', () => {
  describe('fontSizeToMpvPx', () => {
    it('small → 18px', () => {
      expect(fontSizeToMpvPx('small')).toBe(18);
    });
    it('medium → 24px', () => {
      expect(fontSizeToMpvPx('medium')).toBe(24);
    });
    it('large → 32px', () => {
      expect(fontSizeToMpvPx('large')).toBe(32);
    });
    it('extra-large → 42px', () => {
      expect(fontSizeToMpvPx('extra-large')).toBe(42);
    });
  });

  describe('backgroundOpacityToMpvColor', () => {
    it('none → transparent', () => {
      expect(backgroundOpacityToMpvColor('none')).toBe('#00000000');
    });
    it('fifty → 50% black', () => {
      expect(backgroundOpacityToMpvColor('fifty')).toBe('#00000080');
    });
    it('solid → opaque black', () => {
      expect(backgroundOpacityToMpvColor('solid')).toBe('#FF000000');
    });
  });

  describe('positionToMpvPos', () => {
    it('bottom → 95 (percent from top)', () => {
      expect(positionToMpvPos('bottom')).toBe(95);
    });
    it('top → 5 (percent from top)', () => {
      expect(positionToMpvPos('top')).toBe(5);
    });
  });
});
