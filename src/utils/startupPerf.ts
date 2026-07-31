/**
 * 59.3: cold-start milestone timing.
 *
 * Records timestamps at key startup milestones and prints ONE summary line
 * when the first screen mounts so cold-start → interactive can be measured
 * on-device (dev or release — plain console, not the __DEV__-gated logger).
 *
 * Milestones:
 *   js-start     — JS bundle evaluation begins (index.js)
 *   store-ready  — Redux store constructed (store/index.ts)
 *   rehydrated   — redux-persist rehydration lifted (App.tsx onRehydrated)
 *   app-mount    — first React render of AppContent
 *   nav-ready    — persisted navigation state restored (NavigationContainer mounts)
 *   first-screen — initial screen finished its first mount (HomeScreen)
 */

const marks = new Map<string, number>();

/** Record a milestone timestamp (first call wins). */
export function mark(name: string): void {
  if (!marks.has(name)) marks.set(name, Date.now());
}

/** Print the summary line. Call from the first mounted screen. */
export function logStartupSummary(): void {
  const t0 = marks.get('js-start');
  if (!t0) return;
  const now = Date.now();
  const fmt = (name: string): string =>
    marks.has(name) ? `${marks.get(name)! - t0}ms` : 'n/a';
  console.log(
    `[startup] cold→interactive=${now - t0}ms | ` +
      `store=${fmt('store-ready')} | rehydrate=${fmt('rehydrated')} | ` +
      `appMount=${fmt('app-mount')} | navReady=${fmt('nav-ready')} | ` +
      `firstScreen=${fmt('first-screen')}`,
  );
}
