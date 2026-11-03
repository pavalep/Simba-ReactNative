/**
 * The PiP action receiver has exactly ONE owner: the player library.
 *
 * ## The defect this pins
 *
 * The platform's PiP action row rendered three buttons — Play/Pause,
 * Expand, Close — right beside the platform's OWN settings / expand /
 * close buttons. The platform's three worked. Ours were inert: tapping one
 * produced no broadcast at all.
 *
 * The cause was the shape of the broadcast, not the app. The PendingIntent
 * behind each action carried an intent that named the receiver's component
 * EXPLICITLY, and an explicit broadcast is resolved through the MANIFEST.
 * `PipActionReceiver` was only ever a RUNTIME registration, so the explicit
 * broadcast resolved to nothing and was dropped before it was ever
 * dispatched.
 *
 * Measured on emulator-5554 (API 37) on 2026-11-03 with
 * `dumpsys activity broadcasts`:
 *   - the same action sent EXPLICITLY was never dispatched (`dispatchTime=--`),
 *     foreground and in PiP alike;
 *   - the same action sent IMPLICITLY was dispatched in 0 ms.
 *
 * The library now owns the receiver: it registers it once per process on the
 * application context, and the action broadcast is implicit so that
 * registration can match it.
 *
 * ## Why the APP must not register it too
 *
 * Two registrations mean every action is delivered twice. A play/pause that
 * toggles twice leaves playback exactly where it was — the same dead-button
 * symptom, with a different cause. The app therefore registers nothing, and
 * this test is what keeps it that way.
 *
 * ## Why this is a source check
 *
 * The contract lives in Kotlin, and this repository has no native test
 * harness. The repo's established answer to "a contract that spans a file no
 * unit test can mount" is a source check — the same shape as
 * `MainActivityBackPress.test.ts` and `usePresentation.test.tsx`. This is
 * that.
 */

const fs = require('fs');
const path = require('path');

// This file is a MODULE, not a script. The repo's other native-source
// guards (`MainActivityBackPress.test.ts`) are top-level scripts, so their
// `const fs` / `const path` live in the global scope. Two script files in
// one TypeScript program that declare the same name collide, and `tsc`
// reports it as a duplicate declaration — which is a false alarm about
// this file. The `export {}` puts this file's declarations in its own
// scope.
export {};

const MAIN_ACTIVITY = path.join(
  __dirname,
  '../../android/app/src/main/java/com/simba/player/MainActivity.kt',
);

/**
 * The file's CODE, with the comments removed.
 *
 * The comment above the removed registration block explains WHY the app must
 * not register the receiver, and it names the API it refuses to use. A guard
 * that matched the raw text would therefore fail on its own documentation —
 * so the guard reads code, not prose.
 */
function readMainActivityCode(): string {
  const raw = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('MainActivity — the PiP action receiver belongs to the library', () => {
  it('does NOT register a broadcast receiver', () => {
    // The library registers it, once per process, on the application
    // context. A second registration here would deliver every PiP action
    // twice, and a play/pause that toggles twice does nothing at all.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/registerReceiver/);
  });

  it('does NOT create a PipActionReceiver', () => {
    // The app has no business knowing the receiver's class exists: the
    // library registers it, and the action broadcast is implicit so that
    // the registration can match it.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/PipActionReceiver/);
  });

  it('does NOT unregister a receiver it never registered', () => {
    // The receiver is registered on the APPLICATION context and
    // deliberately outlives this Activity — the platform's PiP action row
    // can fire while the Activity is paused inside PiP.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/unregisterReceiver/);
  });

  it('does NOT ask the library for a filter to register with', () => {
    // `PipManager.intentFilter()` is `internal` in the library precisely so
    // the compiler refuses this. The source check is the belt to that
    // braces: a consumer that re-implemented the filter here would be back
    // to owning a second registration.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/intentFilter/);
  });

  it('leaves no diagnostic instrumentation behind', () => {
    // The probes that produced the measurements are not allowed to ship.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/PIPDIAG/);
  });
});
