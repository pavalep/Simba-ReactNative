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
 *
 * ── Why the providers go in `wrapper`, not in the element ──────────
 *
 * This was `render(<ToastProvider>{ui}</ToastProvider>)`, which works
 * for the initial render and then **silently breaks on `rerender`**.
 *
 * RNTL's `rerender(next)` replaces the rendered tree with `next`. When
 * the providers are part of the element, `rerender(<VideoTitleOverlay
 * />)` therefore drops them — and the suite dies on the next render
 * with "useToast must be used within a ToastProvider", several
 * assertions after the one that introduced the dependency.
 *
 * Passing the providers as RNTL's `wrapper` option fixes it once, for
 * every suite: `rerender` re-applies the wrapper, so a component tree
 * keeps its providers across re-renders the way the real app does.
 * Any future chrome component that reaches for an app context is then
 * covered by construction rather than by the next person's rerender
 * test.
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
  const Providers: React.FC<{children: React.ReactNode}> = ({children}) =>
    theme ? (
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    ) : (
      <ToastProvider>{children}</ToastProvider>
    );

  // `wrapper`, not a wrapping element — see the note above.
  return render(ui, {wrapper: Providers});
}