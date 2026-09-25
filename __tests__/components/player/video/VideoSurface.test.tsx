/**
 * V19 W1 — `VideoSurface` unit tests.
 *
 * Mirrors TRACKER Phase 1.1 verifications. The surface itself is a
 * thin wrapper around `<View flex:1>`; the test asserts (a) the
 * container renders with absoluteFill geometry, (b) the placeholder
 * background uses the theme's `surfaceDark` token, (c) the
 * accessibility role + label are correct, (d) the component does not
 * import any chrome primitive (chrome is a sibling, never a child).
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.1.
 */

import * as React from 'react';
import {render, screen} from '@testing-library/react-native';
import {VideoSurface} from '../../../../src/components/player/video/VideoSurface/VideoSurface';

// Mock the theme so we don't depend on the full theme tree.
jest.mock('../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {surfaceDark: '#000000'},
      text: {primary: '#FFFFFF'},
      accent: {gold: '#C9A84C'},
    },
    spacing: {md: 16, sm: 8, lg: 24},
    typography: {
      body1: {fontSize: 16, lineHeight: 22, fontWeight: '400'},
    },
  }),
}));

describe('VideoSurface', () => {
  it('renders the absoluteFill container with the placeholder color', () => {
    render(<VideoSurface />);
    const surface = screen.getByLabelText('Video');
    expect(surface).toBeTruthy();
    expect(surface.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}),
      ]),
    );
    // The placeholder uses the theme token (not a raw hex literal).
    const flattened = Array.isArray(surface.props.style)
      ? surface.props.style.flat(Infinity)
      : [surface.props.style];
    const hasToken = flattened.some(
      (s: object) => (s as {backgroundColor?: string}).backgroundColor === '#000000',
    );
    expect(hasToken).toBe(true);
  });

  it('exposes accessibilityRole="image" with a custom label', () => {
    render(<VideoSurface accessibilityLabel="My Movie Title" />);
    const surface = screen.getByLabelText('My Movie Title');
    expect(surface.props.accessibilityRole).toBe('image');
    expect(screen.queryByLabelText('Video')).toBeNull();
  });

  it('falls back to the default "Video" label when no label is provided', () => {
    render(<VideoSurface />);
    expect(screen.getByLabelText('Video')).toBeTruthy();
  });

  it('does NOT import any chrome primitive (chrome is sibling-only)', () => {
    // Static check: the file's import surface is limited to react /
    // react-native / theme. Enforced by ESLint `no-restricted-imports`
    // at CI time; this test is a runtime guard for the same contract.
    //
    // Reading the source as a string is the lightest-weight way to
    // assert the boundary without coupling to the bundler's resolution.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../../src/components/player/video/VideoSurface/VideoSurface.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/TransportBar|VideoTitleOverlay|VideoLoadingOverlay|VideoErrorOverlay|VideoMiniPlayer/);
  });
});
