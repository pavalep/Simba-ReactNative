/**
 * `renderChrome()` — the provider wrapper for V19 chrome component tests.
 *
 * **Why this exists.** The chrome reaches for two app-level React
 * contexts that a bare `render(<X />)` does not provide:
 *
 *   - `useTheme()`  → "useTheme must be used within a ThemeProvider"
 *   - `useToast()`  → "useToast must be used within a ToastProvider"
 *
 * Both surfaced as hard failures in the V19 component suites, and the
 * toast one appeared only after `VideoMoreSheet` started reporting
 * Save / Add-to-playlist outcomes through `useToast` instead of
 * swallowing them. Wrapping each test individually is the boilerplate
 * this helper removes.
 *
 * ```tsx
 * const {getByText} = await renderChrome(<TransportBar />);
 * ```
 *
 * `theme: false` is for the many suites that already `jest.mock` the
 * theme module — their mock factory only exports `useTheme`, so
 * importing the real `ThemeProvider` from that mocked path would be
 * `undefined`. Those tests still need the `ToastProvider`.
 *
 * `render` is async in `@testing-library/react-native` v14, so callers
 * must `await renderChrome(...)`.
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {ThemeProvider} from '../../src/theme';
import {ToastProvider} from '../../src/components/feedback/Toast';

export interface RenderChromeOptions {
  /**
   * Wrap in the real `ThemeProvider`. Leave false when the suite has
   * `jest.mock`ed the theme module (its factory typically exports only
   * `useTheme`, so `ThemeProvider` would be undefined there).
   */
  theme?: boolean;
}

export async function renderChrome(
  ui: React.ReactElement,
  {theme = false}: RenderChromeOptions = {},
) {
  const inner = theme ? (
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  ) : (
    <ToastProvider>{ui}</ToastProvider>
  );
  return render(inner);
}
