/**
 * The font fallback guard — for the two components this wave fixed.
 *
 * 2026-11-12. Two defects in the same class shipped to the device:
 *
 *   1. `SubsectionTitle`'s `displaySerif` label asked for
 *      `fontWeight: '700'` + `fontStyle: 'italic'`, which resolves to
 *      `Cormorant Garamond_bold_italic.ttf` — a file that DOES NOT
 *      SHIP. React Native falls back to the system font SILENTLY, and
 *      the label was measured with one face and drawn with another, so
 *      the last glyph was dropped: "Librar", "Accoun", "Activit",
 *      "Appearanc", "Playbac" — on every divider in the app.
 *
 *   2. `InternalHeader`'s title style carried `fontWeight: '700'` on
 *      top of the `Manrope SemiBold` family, which resolves to
 *      `Manrope SemiBold_bold.ttf` — also not shipped. The same silent
 *      fallback (CF-03).
 *
 * WHY A TEST AND NOT JUST THE GATE
 *
 * `scripts/check-font-resolution.js` audits every `<AppText>` / `<Text>`
 * in `src/` — but it only reads a style that is written as
 * `style={styles.X}` or an inline `style={{...}}`. Both of these
 * components pass their style CONDITIONALLY
 * (`style={isDisplaySerif ? displaySerifOverride : styles.label}`), so
 * the gate never saw them. Measured on 2026-11-12: of 685 text tags in
 * `src/`, the gate audits 259 and skips 426.
 *
 * Closing that 426-tag gap is a whole wave of its own (it would surface
 * every conditional style in the app at once). This file closes the two
 * holes that actually shipped, by rendering the components and
 * resolving the font the way React Native does — the same rule the
 * gate implements, applied to the REAL rendered style.
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import {StyleSheet, type TextStyle} from 'react-native';
import {renderWithProviders} from '../helpers/renderWithProviders';
import {SubsectionTitle} from '../../src/components/utility/SubsectionTitle/SubsectionTitle';
import {InternalHeader} from '../../src/components/layout/InternalHeader/InternalHeader';

// ─── React Native's own font resolution (Android) ──────────────────────────
//
// ReactFontManager.kt opens EXACTLY ONE path per usage:
//   "fonts/" + <fontFamily> + <styleSuffix> + <fileExtension>
// where <styleSuffix> comes from the weight (nearestStyle):
//   weight <  700  ->  ""            | "_italic"
//   weight >= 700  ->  "_bold"       | "_bold_italic"
// If the file is missing, RN falls back to the SYSTEM font — silently.
// See src/constants/fontFamily.ts for the annotated source references.

const FONTS_DIR = path.resolve(
  __dirname,
  '../../android/app/src/main/assets/fonts',
);

/** The asset file React Native would open for this style. */
function assetFileFor(style: TextStyle): string {
  const family = style.fontFamily;
  if (!family) {
    throw new Error('the style declares no fontFamily');
  }
  const weight = String(style.fontWeight ?? '400');
  const bold = Number(weight) >= 700;
  const italic = style.fontStyle === 'italic';

  let suffix = '';
  if (italic) {
    suffix = bold ? '_bold_italic' : '_italic';
  } else if (bold) {
    suffix = '_bold';
  }

  return `${family}${suffix}.ttf`;
}

function shippedFonts(): string[] {
  return fs.readdirSync(FONTS_DIR);
}

describe('font resolution — the divider label and the header title', () => {
  it('the divider label resolves to a font file that ships', async () => {
    const {getByText} = await renderWithProviders(
      () => <SubsectionTitle label="Activity" variant="displaySerif" />,
      {routeName: 'About'},
    );

    const style = StyleSheet.flatten(getByText('Activity').props.style) as TextStyle;
    const file = assetFileFor(style);

    expect(file).toBe('Cormorant Garamond_italic.ttf');
    expect(shippedFonts()).toContain(file);
  });

  it('the divider label is 18 px with no letter spacing', async () => {
    // The trailing advance of a positive letterSpacing is what pushed
    // the final glyph past the label's own measured box.
    const {getByText} = await renderWithProviders(
      () => <SubsectionTitle label="Activity" variant="displaySerif" />,
      {routeName: 'About'},
    );

    const style = StyleSheet.flatten(getByText('Activity').props.style) as TextStyle;

    expect(style.fontSize).toBe(18);
    expect(style.letterSpacing).toBe(0);
    expect(style.fontWeight).toBe('400');
  });

  it('the header title resolves to a font file that ships', async () => {
    const {getByText} = await renderWithProviders(
      () => <InternalHeader title="About" />,
      {routeName: 'About'},
    );

    const style = StyleSheet.flatten(getByText('About').props.style) as TextStyle;
    const file = assetFileFor(style);

    expect(file).toBe('Manrope SemiBold.ttf');
    expect(shippedFonts()).toContain(file);
  });

  it('the header title is 22 px — the Profile’s size, not the old 48', async () => {
    const {getByText} = await renderWithProviders(
      () => <InternalHeader title="About" />,
      {routeName: 'About'},
    );

    const style = StyleSheet.flatten(getByText('About').props.style) as TextStyle;

    expect(style.fontSize).toBe(22);
  });

  it('the two combinations that shipped the bug really are absent', async () => {
    // If these files DID ship, the guards above would be vacuous. They
    // do not ship — which is exactly why React Native fell back.
    const shipped = shippedFonts();

    expect(shipped).not.toContain('Cormorant Garamond_bold_italic.ttf');
    expect(shipped).not.toContain('Manrope SemiBold_bold.ttf');
  });
});
