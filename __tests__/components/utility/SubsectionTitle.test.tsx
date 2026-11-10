/**
 * `SubsectionTitle` — the divider's gold.
 *
 * ## The defect this pins
 *
 * The divider's label colour was a hard-coded pair of `rgba(...)`
 * literals — one per theme — and the pair was **SWAPPED**:
 *
 *   dark mode  → `rgba(184, 146, 46, 0.9)`  (#B8922E — the LIGHT gold)
 *   light mode → `rgba(201, 168, 76, 0.9)`  (#C9A84C — the DARK gold)
 *
 * while `theme/tokens.ts` has it the other way round: dark `#C9A84C`,
 * light `#B8922E`. The component's own comment stated the mapping
 * correctly and the code did the opposite, which is how it survived:
 * a hard-coded colour is indistinguishable from a correct one at the
 * call site, and nobody compares a divider's gold against the palette
 * unless they are looking for it.
 *
 * The colour is now READ from the theme and only the alpha is applied
 * (`withAlpha`), so the two cannot drift apart. These tests assert the
 * result in BOTH themes, because a fix that only fixes one of them is
 * the same bug half-repaired.
 *
 * The REAL tokens are used here — the point is that the component and the
 * palette agree, and a mocked palette would agree with anything.
 */

import React from 'react';
import {StyleSheet} from 'react-native';
import {render, screen} from '@testing-library/react-native';

jest.mock('../../../src/theme', () => {
  const actual = jest.requireActual('../../../src/theme/tokens');
  const state: {theme: 'dark' | 'light'} = {theme: 'dark'};
  return {
    __mockThemeState: state,
    useTheme: () => {
      const tokens = state.theme === 'dark' ? actual.darkTokens : actual.lightTokens;
      return {
        theme: state.theme,
        tokens,
        colors: tokens.colors,
        legacy: actual.legacyFromTokens(tokens),
        spacing: tokens.spacing,
        typography: tokens.typography,
        shadows: tokens.shadows,
        radius: tokens.radius,
        motion: tokens.motion,
        isDark: state.theme === 'dark',
        setTheme: jest.fn(),
        themeMode: state.theme,
      };
    },
  };
});

import {SubsectionTitle} from '../../../src/components/utility/SubsectionTitle/SubsectionTitle';

const {__mockThemeState} = jest.requireMock('../../../src/theme') as {
  __mockThemeState: {theme: 'dark' | 'light'};
};

/** The colour the divider's label was actually drawn in. */
function drawnLabelColor(): string | undefined {
  const style = StyleSheet.flatten(screen.getByText('Your Library').props.style);
  return style?.color;
}

async function renderDivider(theme: 'dark' | 'light') {
  __mockThemeState.theme = theme;
  return await render(<SubsectionTitle label="Your Library" variant="displaySerif" />);
}

describe('SubsectionTitle — the divider draws the theme\'s own gold', () => {
  it('uses the DARK theme\'s gold in dark mode', async () => {
    await renderDivider('dark');

    // #C9A84C = (201, 168, 76) — `theme/tokens.ts`, dark palette.
    expect(drawnLabelColor()).toBe('rgba(201, 168, 76, 0.9)');
  });

  it('uses the LIGHT theme\'s gold in light mode', async () => {
    await renderDivider('light');

    // #B8922E = (184, 146, 46) — `theme/tokens.ts`, light palette.
    expect(drawnLabelColor()).toBe('rgba(184, 146, 46, 0.9)');
  });

  it('does not draw the other theme\'s gold', async () => {
    // The regression, stated as the thing that must never happen again.
    await renderDivider('dark');
    expect(drawnLabelColor()).not.toBe('rgba(184, 146, 46, 0.9)');
  });
});
